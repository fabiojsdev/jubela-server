import { IsEmail, IsString } from 'class-validator';
import { Employee } from 'src/employees/entities/employee.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class LogEmployee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  @IsEmail()
  email: string;

  @Column({ type: 'varchar', length: 125 })
  @IsString()
  name: string;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee' })
  employee: Employee;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
