import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TokenPayloadDTO } from 'src/auth/dto/token-payload.dto';
import { UrlUuidDTO } from 'src/common/dto/url-uuid.dto';
import { EmailService } from 'src/email/email.service';
import { EmployeesService } from 'src/employees/employee.service';
import { Order } from 'src/orders/entities/order.entity';
import { Like, Repository } from 'typeorm';
import { CreateProductDTO } from './dto/create-product.dto';
import { PaginationAllProductsDTO } from './dto/pagination-all-products.dto';
import { PaginationByEmployeeDTO } from './dto/pagination-by-employee.dto';
import { PaginationDTO } from './dto/pagination-product.dto';
import { UpdateProductDTO } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly employeesService: EmployeesService,
    private readonly emailService: EmailService,
  ) {}

  async Create(
    createProductDTO: CreateProductDTO,
    files: Array<Express.Multer.File>,
    tokenPayloadDTO: TokenPayloadDTO,
  ) {
    const { sub } = tokenPayloadDTO;

    const imagesCreate = await this.FileCreate(files);

    const findEmployee = await this.employeesService.FindById(sub);

    const decimalPrice = new Decimal(createProductDTO.price);

    const createProductData = {
      name: createProductDTO.name,
      category: createProductDTO.category,
      description: createProductDTO.description,
      price: decimalPrice.toString(),
      images: imagesCreate,
      quantity: createProductDTO.quantity,
      sku: createProductDTO.sku,
      employee: findEmployee,
      order: null,
    };

    const productCreate = this.productsRepository.create(createProductData);

    const newProductData = await this.productsRepository.save(productCreate);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { images, description, ...convenientData } = newProductData;

    return {
      ...convenientData,
    };
  }

  async FileCreate(files: Array<Express.Multer.File>) {
    const imagesString = [];

    await Promise.all(
      files.map(async (file) => {
        const fileFullPath = path.resolve(
          process.cwd(),
          'images',
          file.originalname,
        );

        await fs.writeFile(fileFullPath, file.buffer);

        // MUDAR A URL EM PRODUÇÃO
        imagesString.push(
          `https://jubela-server-api.onrender.com/images/${file.originalname}`,
        );
      }),
    );

    return imagesString;
  }

  async FileExists(path: string) {
    try {
      await fs.stat(path);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async FileUnlink(path: string) {
    try {
      await fs.unlink(path);
      return 'Imagem excluída';
    } catch (error) {
      if (error.code === 'EBUSY' || error.code === 'EPERM') {
        return 'Arquivo em uso';
      } else if (error.code === 'ENOENT') {
        return 'Arquivo já não existe';
      } else {
        return 'Erro desconhecido';
      }
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

  async ImagesDeleteFromDb(id: string, images: string[]) {
    try {
      await this.productsRepository
        .createQueryBuilder()
        .update()
        .set({
          images: () => `ARRAY(
          SELECT unnest("images")
          EXCEPT
          SELECT unnest(:removeImages::varchar[] )
          )`,
        })
        .where('id = :id', { id })
        .setParameters({ removeImages: images })
        .execute();

      return 'Imagens excluídas do banco de dados';
    } catch (error) {
      console.log({
        message: error.message,
      });
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

  async StockCheck(productId: string, orderQuantity: number, orderId: string) {
    const orderDelete = await this.ordersRepository.delete(orderId);

    if (orderDelete.affected < 1) {
      throw new InternalServerErrorException(
        `Erro ao deletar pedido ${orderId}`,
      );
    }

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
