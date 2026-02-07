import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UploadApiResponse } from 'cloudinary';
import * as path from 'path';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UrlUuidDTO } from 'src/common/dto/url-uuid.dto';
import { EmailService } from 'src/email/email.service';
import { EmployeesService } from 'src/employees/employee.service';
import { Employee } from 'src/employees/entities/employee.entity';
import { DataSource, Like, Repository } from 'typeorm';
import { CreateProductDTO } from './dto/create-product.dto';
import { PaginationAllProductsDTO } from './dto/pagination-all-products.dto';
import { PaginationByEmployeeDTO } from './dto/pagination-by-employee.dto';
import { PaginationDTO } from './dto/pagination-product.dto';
import { UpdateProductDTO } from './dto/update-product.dto';
import { ProductImages } from './entities/product-images.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(ProductImages)
    private readonly productImagesRepository: Repository<ProductImages>,
    private readonly employeesService: EmployeesService,
    private readonly emailService: EmailService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly logger: Logger,
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

  async ImageDelete(images: string[], productId: string) {
    const findProduct = await this.FindById(productId);

    const deleteFromDb = await this.ImagesDeleteFromDb(findProduct.id, images);

    if (!deleteFromDb) {
      throw new InternalServerErrorException(
        'Erro ao tentar excluir imagens do banco de dados',
      );
    }

    const fileFullPath = path.resolve(process.cwd(), 'images');

    for (let i = 0; i < images.length; i++) {
      const imageName = images[i].split('/').pop();

      const imageFullPath = path.join(fileFullPath, imageName);

      if (!imageFullPath.startsWith(fileFullPath)) {
        throw new Error('Path traversal detectado');
      }

      const imageVerify = await this.FileExists(imageFullPath);

      if (!imageVerify) {
        throw new NotFoundException('Imagem não cadastrada');
      }

      const imageDelete = await this.FileUnlink(imageFullPath);

      if (imageDelete !== 'Imagem excluída') {
        switch (imageDelete) {
          case 'Arquivo em uso':
            throw new ConflictException(imageDelete);

          case 'Arquivo já não existe':
            throw new NotFoundException(imageDelete);

          case 'Erro desconhecido':
            throw new InternalServerErrorException(
              'Erro ao tentar exlcuir imagem',
            );
        }
      }

      return imageDelete;
    }
  }

  async Update(
    id: string,
    updateProductDTO: UpdateProductDTO,
    files: Array<Express.Multer.File>,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sku, ...restOfProductData } = updateProductDTO;

    const productExists = this.productsRepository.findOne({
      where: {
        id,
      },
    });

    if (!productExists) {
      throw new NotFoundException('Produto não encontrado');
    }

    const productUpdate = await this.productsRepository.preload({
      id,
      ...restOfProductData,
    });

    if (!productUpdate) {
      throw new InternalServerErrorException(
        'Erro ao tentar atualizar dados do produto',
      );
    }

    const updatedData = await this.productsRepository.save(productUpdate);

    const updateImages = await this.FileCreate(files);

    for (const image of updateImages) {
      await this.productsRepository
        .createQueryBuilder()
        .update()
        .set({
          images: () => `array_append("images", :newImage)`,
        })
        .where('id = :id', { id })
        .setParameters({ newImage: image })
        .execute();
    }

    return {
      ...updatedData,
    };
  }

  async Delete(deleteIdDTO: UrlUuidDTO) {
    const findProduct = await this.FindById(deleteIdDTO.id);

    await this.ImageDelete(findProduct.images, deleteIdDTO.id);

    const deleteProduct = await this.productsRepository.delete(deleteIdDTO);

    if (deleteProduct.affected < 1) {
      throw new NotFoundException('Produto não encontrado');
    }

    return 'Produto deletado';
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
