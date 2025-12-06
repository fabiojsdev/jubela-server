import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { UrlUuidDTO } from 'src/common/dto/url-uuid.dto';
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
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async Create(
    createProductDTO: CreateProductDTO,
    files: Array<Express.Multer.File>,
  ) {
    const imagesCreate = await this.FileCreate(files);

    const dataToSave = {
      ...createProductDTO,
      images: imagesCreate,
    };

    const productCreate = this.productsRepository.create(dataToSave);

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

        imagesString.push(`http://localhost:3000/images/${file.originalname}`);
      }),
    );

    return imagesString;
  }

  async FileExists(path: string) {
    try {
      await fs.access(path, fs.constants.F_OK);
      return true;
    } catch {
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

  async ImageDelete(images: string[]) {
    for (let i = 0; i < images.length; i++) {
      const imageVerify = await this.FileExists(images[i]);

      if (!imageVerify) {
        throw new NotFoundException('Imagem não cadastrada');
      }

      const imageDelete = await this.FileUnlink(images[i]);

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
    }
  }

  async Update(
    productIdDTO: UrlUuidDTO,
    updateProductDTO: UpdateProductDTO,
    files: Array<Express.Multer.File>,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sku, ...restOfProductData } = updateProductDTO;
    const id = productIdDTO.id;

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

    await this.productsRepository.save(productUpdate);

    const updateImages = await this.FileCreate(files);

    const updateImagesString = await this.productsRepository
      .createQueryBuilder()
      .update()
      .set({
        images: () => `array_append("images", :image)`,
      })
      .where('id = :id', { id })
      .setParameters({ newImage: updateImages })
      .execute();

    if (updateImagesString.affected < 1) {
      throw new InternalServerErrorException(
        'Erro ao tentar atualizar imagens',
      );
    }
  }

  async Delete(deleteIdDTO: UrlUuidDTO) {
    const deleteProduct = await this.productsRepository.delete(deleteIdDTO);

    if (deleteProduct.affected < 1) {
      throw new NotFoundException('Produto não encontrado');
    }

    return 'Produto deletado';
  }

  async ListProducts(paginationAllProducts?: PaginationAllProductsDTO) {
    const { limit, offset } = paginationAllProducts;

    const findAll = await this.productsRepository.findAndCount({
      take: limit,
      skip: offset,
      order: {
        id: 'desc',
      },
      where: {},
    });

    return findAll;
  }

  async FindByName(paginationDTO: PaginationDTO) {
    const { limit, offset, value } = paginationDTO;

    const productFindByName = await this.productsRepository.find({
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

    return productFindByName;
  }

  async FindByCategory(paginationDTO: PaginationDTO) {
    const { limit, offset, value } = paginationDTO;

    const productFindByName = await this.productsRepository.find({
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

    const productFindByEmployee = await this.productsRepository.find({
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

    return productFindByEmployee;
  }
}
