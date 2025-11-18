import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 60 })
  category: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'varchar', length: 15 })
  price: string;

  @Column({ type: 'varchar', length: 120 })
  images: string[];

  @Column({ type: 'int' })
  quantity: string;

  @Column({ type: 'varchar', length: 255 })
  sku: string;
}
