import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UploadApiResponse } from 'cloudinary';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { EmailService } from 'src/email/email.service';
import { EmployeesService } from 'src/employees/employee.service';
import { Employee } from 'src/employees/entities/employee.entity';
import { DataSource, Like, QueryRunner, Repository } from 'typeorm';
import { CreateProductDTO } from './dto/create-product.dto';
import { PaginationByEmployeeDTO } from './dto/pagination-by-employee.dto';
import { ProductFindByCategoryDTO } from './dto/product-find-by-category.dto';
import { ProductFindByNameDTO } from './dto/product-find-by-name.dto';
import { UpdatePriceProductDTO } from './dto/update-product-price.dto';
import { UpdateProductDTO } from './dto/update-product.dto';
import { ProductImages } from './entities/product-images.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(ProductImages)
    private readonly productImagesRepository: Repository<ProductImages>,
    private readonly employeesService: EmployeesService,
    private readonly emailService: EmailService,
    private readonly cloudinaryService: CloudinaryService,

    private dataSource: DataSource,
  ) {}

  async Create(
    createProductDTO: CreateProductDTO,
    files: Array<Express.Multer.File>,
    tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const { sub } = tokenPayloadDTO;

    const findEmployee = await this.employeesService.FindById(sub);

    if (!findEmployee) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    let uploadResults: UploadApiResponse[];

    try {
      uploadResults = await this.cloudinaryService.UploadMultipleImages(
        files,
        'products',
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao fazer upload das imagens: ${error.message}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const doesEmployeeReallyExists = await queryRunner.manager.findOne(
        Employee,
        {
          where: {
            id: tokenPayloadDTO.sub,
          },
        },
      );

      if (!doesEmployeeReallyExists) {
        throw new NotFoundException('Funcionário não encontrado');
      }

      const createProductData = {
        ...createProductDTO,
        employee: findEmployee,
      };

      const createProduct = queryRunner.manager.create(
        Product,
        createProductData,
      );

      const newProduct = await queryRunner.manager.save(Product, createProduct);

      const images = uploadResults.map((result, index) => {
        return queryRunner.manager.create(ProductImages, {
          url: result.secure_url,
          publicId: result.public_id,
          isMain: index === 0,
          order: index + 1,
          product: newProduct,
        });
      });

      await queryRunner.manager.save(ProductImages, images);

      await queryRunner.commitTransaction();

      const createdProduct = await this.productsRepository.findOne({
        where: {
          id: newProduct.id,
        },
        relations: {
          images: true,
        },
      });

      if (!createProduct) {
        throw new NotFoundException('Produto não encontrado');
      }

      return createdProduct;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(`Erro ao cadastrar produto: ${error.message}`);

      try {
        const publicIds = uploadResults.map((results) => results.public_id);
        await this.cloudinaryService.DeleteMultipleImages(publicIds);
      } catch (cleanupError) {
        // Se cleanup falhar, loga mas não quebra a aplicação
        this.logger.error('Erro ao fazer cleanup das imagens:', cleanupError);
        // Você pode enviar para um sistema de log/monitoramento aqui
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Falha ao processar transação na criação de produto',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async Update(
    id: string,
    imageId: string,
    updateProductDTO: UpdateProductDTO,
    file: Express.Multer.File,
  ) {
    const updatesPerformed = [];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const findProduct = await queryRunner.manager.findOne(Product, {
        where: {
          id,
        },
      });

      if (!findProduct) {
        throw new NotFoundException('Produto não encontrado');
      }

      if (file) {
        await this.ReplaceImage(findProduct, imageId, file, queryRunner);
        updatesPerformed.push('image');
      }

      await this.UpdateRegularData(findProduct, updateProductDTO, queryRunner);

      for (let i = 0; i < Object.keys(updateProductDTO).length; i++) {
        updatesPerformed.push(Object.keys(updateProductDTO));
      }

      await queryRunner.commitTransaction();

      const findUpdatedProduct = await this.productsRepository.findOne({
        where: {
          id,
        },
      });

      return {
        updatedFields: updatesPerformed,
        product: findUpdatedProduct,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(`Erro ao atualizar produto: ${error}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Falha ao processar transação na atualização do produto',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async UpdatePrice(
    id: string,
    updateProductPriceDataDTO: UpdatePriceProductDTO,
  ) {
    const findProduct = await this.productsRepository.findOne({
      where: {
        id,
      },
    });

    if (!findProduct) {
      throw new NotFoundException('Produto não encontrado');
    }

    const productUpdate = await this.productsRepository.preload({
      id,
      price: updateProductPriceDataDTO.price,
    });

    const updatedProduct = await this.productsRepository.save(productUpdate);

    if (!productUpdate || !updatedProduct) {
      throw new InternalServerErrorException(
        'Erro ao tentar atualizar preço do produto',
      );
    }

    return updatedProduct;
  }

  private async UpdateRegularData(
    product: Product,
    updateProductRegularDataDTO: UpdateProductDTO,
    queryRunnerSub: QueryRunner,
  ) {
    if (Object.keys(updateProductRegularDataDTO).length < 1) return;

    const productUpdate = await queryRunnerSub.manager.update(
      Product,
      product.id,
      {
        id: product.id,
        ...updateProductRegularDataDTO,
      },
    );

    if (!productUpdate || productUpdate.affected < 1) {
      throw new InternalServerErrorException(
        'Erro ao tentar atualizar produto',
      );
    }
  }

  /**
   * Substitui uma imagem específica por outra
   * Mantém a ordem e se é principal ou não
   */
  private async ReplaceImage(
    product: Product,
    imageId: string,
    file: Express.Multer.File,
    queryRunnerSub: QueryRunner,
  ) {
    const imageToReplace = product.images.find((img) => img.id === imageId);

    if (!imageToReplace) {
      throw new NotFoundException('Imagem não encontrada');
    }

    // Guarda informações da imagem antiga
    const { publicId: oldPublicId } = imageToReplace;

    // 2. Upload da nova imagem ANTES da transação
    let uploadResult: UploadApiResponse;
    try {
      const results = await this.cloudinaryService.UploadMultipleImages(
        [file],
        'products',
      );
      uploadResult = results[0];
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao fazer upload da imagem: ${error.message}`,
      );
    }

    // 3. Transação: Atualiza no banco

    // ✅ ATUALIZA a entidade existente (não cria nova)
    imageToReplace.url = uploadResult.secure_url;
    imageToReplace.publicId = uploadResult.public_id;
    // isMain e order permanecem iguais

    await queryRunnerSub.manager.save(ProductImages, imageToReplace);

    // 4. Deleta a imagem antiga do Cloudinary
    try {
      await this.cloudinaryService.DeleteMultipleImages([oldPublicId]);
    } catch (error) {
      console.error(
        'Erro ao deletar imagem antiga do Cloudinary:',
        error.message,
      );

      // Cleanup: deleta nova imagem do Cloudinary para não deixar órfã
      try {
        await this.cloudinaryService.DeleteMultipleImages([
          uploadResult.public_id,
        ]);
      } catch (cleanupError) {
        console.error('Erro no cleanup:', cleanupError.message);
      }

      throw new InternalServerErrorException(
        `Erro ao substituir imagem, operação revertida ${error.message}`,
      );
    }
  }

  /**
   * Adiciona novas imagens a um produto existente
   */
  async AddImages(productId: string, files: Express.Multer.File[]) {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
      relations: {
        images: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    // Validação: limite máximo de imagens
    const MAX_IMAGES = 4;
    if (product.images.length + files.length > MAX_IMAGES) {
      throw new BadRequestException(
        `Produto pode ter no máximo ${MAX_IMAGES} imagens`,
      );
    }

    // 1. Upload das novas imagens
    let uploadResults: UploadApiResponse[];
    try {
      uploadResults = await this.cloudinaryService.UploadMultipleImages(
        files,
        'products',
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao fazer upload das imagens: ${error.message}`,
      );
    }

    // 2. Transação: Adiciona no banco
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const doesProductReallyExists = await queryRunner.manager.findOne(
        Product,
        {
          where: {
            id: productId,
          },
        },
      );

      if (!doesProductReallyExists) {
        throw new NotFoundException('Produto não encontrado');
      }

      // Pega a maior ordem atual
      const currentMaxOrder =
        product.images.length > 0
          ? Math.max(...product.images.map((img) => img.order))
          : 0;

      // Cria novas entidades de imagem
      const newImages = uploadResults.map((result, index) => {
        return queryRunner.manager.create(ProductImages, {
          url: result.secure_url,
          publicId: result.public_id,
          isMain: false, // Novas imagens não são principais
          order: currentMaxOrder + index + 1,
          product: product,
        });
      });

      await queryRunner.manager.save(ProductImages, newImages);

      await queryRunner.commitTransaction();

      return this.productsRepository.findOne({
        where: { id: productId },
        relations: {
          images: true,
        },
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Cleanup: deleta do Cloudinary
      const publicIds = uploadResults.map((r) => r.public_id);
      try {
        await this.cloudinaryService.DeleteMultipleImages(publicIds);
      } catch (cleanupError) {
        console.error('Erro no cleanup:', cleanupError.message);
      }

      if (error instanceof HttpException) {
        throw error;
      }
    } finally {
      await queryRunner.release();
    }
  }

  async RemoveImage(productId: string, imageId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const findProduct = await queryRunner.manager.findOne(Product, {
        where: {
          id: productId,
        },
        relations: {
          images: true,
        },
      });

      if (!findProduct) {
        throw new NotFoundException('Produto não encontrado');
      }

      const imageToRemove = findProduct.images.find(
        (img) => img.id === imageId,
      );

      if (!imageToRemove) {
        throw new NotFoundException('Imagem não encontrada');
      }

      const publicIdToDelete = imageToRemove.publicId;

      await queryRunner.manager.remove(ProductImages, imageToRemove);

      const remainingImages = await queryRunner.manager.find(ProductImages, {
        where: { product: { id: productId } },
        order: { order: 'ASC' },
      });

      if (remainingImages.length > 0) {
        remainingImages.forEach((img, index) => {
          img.order = index + 1;
        });

        await queryRunner.manager.save(ProductImages, remainingImages);
      }

      await queryRunner.commitTransaction();

      try {
        await this.cloudinaryService.DeleteMultipleImages([publicIdToDelete]);
      } catch (cloudinaryError) {
        // ⚠️ Banco já foi commitado, então não podemos reverter
        // Loga o erro para investigação/cleanup manual
        console.error(
          `ATENÇÃO: Imagem deletada do banco mas falhou no Cloudinary:`,
          {
            productId,
            imageId,
            publicId: publicIdToDelete,
            error: cloudinaryError.message,
          },
        );

        // Aqui você poderia:
        // - Adicionar em uma fila de cleanup
        // - Enviar alerta para monitoramento
        // - Gravar em tabela de "orphan_images" para cleanup posterior
      }

      return this.productsRepository.findOne({
        where: { id: productId },
        relations: {
          images: true,
        },
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Erro ao atualizar ingredientes do produto: ${error.message}`,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Falha ao processar transação na atualização dos ingredientes do produto',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async Delete(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await queryRunner.manager.findOne(Product, {
        where: { id },
        relations: {
          images: true,
        },
      });

      if (!product) {
        throw new NotFoundException('Produto não encontrado');
      }

      const publicIdsToDelete = product.images.map((img) => img.publicId);

      await queryRunner.manager.remove(Product, product);

      await queryRunner.commitTransaction();

      if (publicIdsToDelete.length > 0) {
        await this.DeleteFromCloudinaryAsync(publicIdsToDelete).catch(
          (error) => {
            this.logger.error('Erro ao deletar do Cloudinary:', error.message);
          },
        );
      }

      return { message: 'Produto deletado com sucesso' };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(`Erro ao excluir produto: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Falha ao processar transação na exclusão de produto',
      );
    } finally {
      await queryRunner.release();
    }
  }

  private async DeleteFromCloudinaryAsync(publicIds: string[]): Promise<void> {
    try {
      await this.cloudinaryService.DeleteMultipleImages(publicIds);
    } catch (error) {
      // // Registra órfãos para cleanup
      // await this.orphanCleanupService.logOrphanImages(
      //   publicIds,
      //   productId,
      //   'Produto deletado',
      // );
      throw error;
    }
  }

  async FindById(id: string) {
    const productFindById = await this.productsRepository.findOneBy({
      id,
    });

    if (!productFindById) {
      throw new NotFoundException('Produto não encontrado');
    }

    return productFindById;
  }

  async ListProducts() {
    const items = await this.productsRepository.find({
      order: {
        id: 'desc',
      },
      where: {},
    });

    return items;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async StockCheck(productId: string, orderQuantity: number, orderId?: string) {
    const findProduct = await this.productsRepository.findOneBy({
      id: productId,
    });

    const { quantity, lowStock } = findProduct;

    switch (true) {
      case quantity < 1:
        throw new BadRequestException(`Produto ${findProduct.name} esgotado`);

      case orderQuantity > quantity:
        throw new BadRequestException(
          `Estoque do produto  ${findProduct.name} insuficiente`,
        );

      case quantity <= lowStock && quantity >= orderQuantity:
        await this.emailService.LowStockWarn(findProduct);
        return;
    }
  }

  async FindByName(nameParam: ProductFindByNameDTO) {
    const productFindByName = await this.productsRepository.find({
      order: {
        id: 'desc',
      },
      where: {
        name: Like(`${nameParam.name}%`),
      },
    });

    if (!productFindByName) {
      throw new InternalServerErrorException(
        'Erro desconhecido ao tentar pesquisar por produtos',
      );
    }

    if (productFindByName.length < 1) {
      throw new NotFoundException('Produtos não encontrados');
    }

    return productFindByName;
  }

  async FindByCategory(categoryParam: ProductFindByCategoryDTO) {
    const productFindByName = await this.productsRepository.find({
      order: {
        id: 'desc',
      },
      where: {
        name: Like(`${categoryParam.category}%`),
      },
    });

    if (!productFindByName) {
      throw new InternalServerErrorException(
        'Erro desconhecido ao tentar pesquisar por produtos',
      );
    }

    if (productFindByName.length < 1) {
      throw new NotFoundException('Produtos não encontrados');
    }

    return productFindByName;
  }

  async FindBySku(sku: string) {
    const productFindBySku = await this.productsRepository.findOneBy({
      sku,
    });

    if (!productFindBySku) {
      throw new NotFoundException('Produto não encontrado');
    }

    return productFindBySku;
  }

  async FindByEmployee(paginationByEmployeeDTO: PaginationByEmployeeDTO) {
    const { limit, offset, value } = paginationByEmployeeDTO;

    const [productFindByEmployee, total] =
      await this.productsRepository.findAndCount({
        take: limit,
        skip: offset,
        order: {
          id: 'desc',
        },
        where: {
          employee: {
            id: value,
          },
        },
        relations: {
          employee: true,
        },
        select: {
          employee: {
            id: true,
            name: true,
            email: true,
            situation: true,
            role: true,
          },
        },
      });

    if (!productFindByEmployee) {
      throw new InternalServerErrorException(
        'Erro desconhecido ao tentar pesquisar por produtos',
      );
    }

    if (productFindByEmployee.length < 1) {
      throw new NotFoundException('Produtos não encontrados');
    }

    return [total, ...productFindByEmployee];
  }
}
