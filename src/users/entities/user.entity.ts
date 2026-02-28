import { IsEmail, IsString } from 'class-validator';
import { Order } from 'src/orders/entities/order.entity';
import { RefreshTokenUser } from 'src/refresh-tokens/entities/refresh-token-user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @IsEmail()
  email: string;

  @Column({ type: 'varchar', length: 125 })
  @IsString()
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsString()
  password_hash: string;

  // Este campo pode ser nulo porque o cliente pode criar uma conta e não comprar nada, ao menos inicialmente
  @OneToMany(() => Order, (order) => order.user)
  order_history: Order[];

  @OneToMany(() => RefreshTokenUser, (token) => token.user)
  refresh_tokens: RefreshTokenUser[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
