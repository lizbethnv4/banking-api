import { Entity, Generated, PrimaryColumn, Column } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  @Generated('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 50, nullable: false, unique: true })
  name: string;
}