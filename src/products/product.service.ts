import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateProductDTO } from './dto/create-product.dto';
import { PaginationDTO } from './dto/pagination-products.dto';
import { UpdateProductDTO } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async Create(createProductDTO: CreateProductDTO) {
    const productCreate = this.productsRepository.create(createProductDTO);

    const newProductData = await this.productsRepository.save(productCreate);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { images, description, ...convenientData } = newProductData;

    return {
      ...convenientData,
    };
  }

  async Update(id: string, updateProductDTO: UpdateProductDTO) {
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

    return this.productsRepository.save(productUpdate);
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
}
