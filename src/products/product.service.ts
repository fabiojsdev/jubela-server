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
import { PaginationAllProductsDTO } from './dto/pagination-all-products.dto';
import { PaginationByEmployeeDTO } from './dto/pagination-by-employee.dto';
import { PaginationDTO } from './dto/pagination-product.dto';
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

  async ImageDelete(id: string) {
    const product = await this.productsRepository.findOne({
      where: {
        id,
      },
      relations: {
        images: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (product.images && product.images.length > 0) {
      const publicIds = product.images.map((img) => img.publicId);

      try {
        await this.cloudinaryService.DeleteMultipleImages(publicIds);
      } catch (error) {
        console.error('Erro ao deletar imagens do Cloudinary:', error);
      }
    }

    await this.productsRepository.remove(product);

    return { message: 'Produto deletado com sucesso' };
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
        await this.ReplaceImage(findProduct.id, imageId, file, queryRunner);
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

      this.logger.error(`Erro ao atualizar produto: ${error.message}`);

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
    productId: string,
    imageId: string,
    file: Express.Multer.File,
    queryRunnerSub: QueryRunner,
  ) {
    // 1. Busca produto e imagem
    const product = await queryRunnerSub.manager.findOne(Product, {
      where: { id: productId },
      relations: {
        images: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

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

    await queryRunnerSub.commitTransaction();

    // 4. Deleta a imagem antiga do Cloudinary
    try {
      await this.cloudinaryService.DeleteMultipleImages([oldPublicId]);
    } catch (error) {
      console.error('Erro ao deletar imagem antiga do Cloudinary:', error);

      // Cleanup: deleta nova imagem do Cloudinary para não deixar órfã
      try {
        await this.cloudinaryService.DeleteMultipleImages([
          uploadResult.public_id,
        ]);
      } catch (cleanupError) {
        console.error('Erro no cleanup:', cleanupError.message);
      }
    }

    throw new InternalServerErrorException(
      'Erro ao substituir imagem, operação revertida.',
    );
  }

  // async Delete(deleteIdDTO: UrlUuidDTO) {
  //   const findProduct = await this.FindById(deleteIdDTO.id);

  //   await this.ImageDelete(findProduct.images, deleteIdDTO.id);

  //   const deleteProduct = await this.productsRepository.delete(deleteIdDTO);

  //   if (deleteProduct.affected < 1) {
  //     throw new NotFoundException('Produto não encontrado');
  //   }

  //   return 'Produto deletado';
  // }

  async FindById(id: string) {
    const productFindById = await this.productsRepository.findOneBy({
      id,
    });

    if (!productFindById) {
      throw new NotFoundException('Produto não encontrado');
    }

    return productFindById;
  }

  async ListProducts(paginationAllProducts?: PaginationAllProductsDTO) {
    const { limit, offset } = paginationAllProducts;

    const [items, total] = await this.productsRepository.findAndCount({
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
      where: {},
    });

    return [total, ...items];
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

  async FindByName(paginationDTO: PaginationDTO) {
    const { limit, offset, value } = paginationDTO;

    const [productFindByName, total] =
      await this.productsRepository.findAndCount({
        take: limit,
        skip: offset,
        order: {
          id: 'desc',
        },
        where: {
          name: Like(`${value}%`),
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

    return [total, ...productFindByName];
  }

  async FindByCategory(paginationDTO: PaginationDTO) {
    const { limit, offset, value } = paginationDTO;

    const [productFindByName, total] =
      await this.productsRepository.findAndCount({
        take: limit,
        skip: offset,
        order: {
          id: 'desc',
        },
        where: {
          name: Like(`${value}%`),
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

    return [total, ...productFindByName];
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
