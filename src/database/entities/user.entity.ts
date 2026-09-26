import { Entity, Generated, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from './role.entity.js';
import { UserStatus } from '../enums.js';

@Entity('users')
export class User {
    @PrimaryColumn({ type: 'uniqueidentifier' })
    @Generated('uuid')
    id: string;

    @ManyToOne(() => Role, { nullable: false, onDelete: 'NO ACTION' })
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @Column({ name: 'role_id', type: 'uniqueidentifier', nullable: false })
    roleId: string;

    @Column({ type: 'nvarchar', length: 255, nullable: false })
    name: string;

    @Column({ type: 'nvarchar', length: 255, nullable: false, unique: true })
    email: string;

    @Column({ name: 'password_hash', type: 'nvarchar', length: 255, nullable: false })
    passwordHash: string;

    @Column({ type: 'nvarchar', length: 20, nullable: false, default: UserStatus.ACTIVE })
    status: UserStatus;

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt: Date;
}