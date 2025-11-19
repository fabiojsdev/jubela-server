import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  item: string;

  @Column({ type: 'int' })
  quantity: string;

  @Column({ type: 'varchar', length: 15 })
  price: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  // @ManyToOne(() => Doctor, { onDelete: 'RESTRICT' })
  // @JoinColumn({ name: 'doctor' })
  // user: Doctor;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
