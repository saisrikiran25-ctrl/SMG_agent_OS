import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IDatabase } from '../db/database';
import {
  TenantRepository,
  UserRepository,
  WorkspaceRepository,
  UserRecord,
  TenantRecord,
  WorkspaceRecord,
} from '../repositories';
import { UserRole } from '@smb/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'smb_super_secret_jwt_key_2026';

export interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tenant_id: string;
    workspace_id?: string;
  };
  tenant: TenantRecord;
  workspace: WorkspaceRecord;
}

export class AuthService {
  private tenantRepo: TenantRepository;
  private userRepo: UserRepository;
  private workspaceRepo: WorkspaceRepository;

  constructor(private db: IDatabase) {
    this.tenantRepo = new TenantRepository(db);
    this.userRepo = new UserRepository(db);
    this.workspaceRepo = new WorkspaceRepository(db);
  }

  async signup(params: {
    companyName: string;
    name: string;
    email: string;
    password: string;
    industry?: string;
  }): Promise<AuthSession> {
    // 1. Create Tenant
    const tenant = await this.tenantRepo.create(params.companyName);

    // 2. Create Default Workspace
    const workspace = await this.workspaceRepo.create(
      tenant.id,
      `${params.companyName} Primary Workspace`,
      params.industry || 'Retail/Distribution'
    );

    // 3. Hash Password & Create Owner User
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(params.password, salt);

    const user = await this.userRepo.create(
      tenant.id,
      params.email,
      passwordHash,
      params.name,
      'Owner',
      workspace.id
    );

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id,
        workspace_id: user.workspace_id,
      },
      tenant,
      workspace,
    };
  }

  async login(tenantId: string, email: string, password: string): Promise<AuthSession> {
    const user = await this.userRepo.findByEmail(tenantId, email);
    if (!user) {
      throw new Error('Invalid credentials or tenant ID');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid credentials or tenant ID');
    }

    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    let workspace: WorkspaceRecord | null = null;
    if (user.workspace_id) {
      workspace = await this.workspaceRepo.findById(tenantId, user.workspace_id);
    }
    if (!workspace) {
      const workspaces = await this.workspaceRepo.listByTenant(tenantId);
      workspace = workspaces[0] || null;
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id,
        workspace_id: user.workspace_id,
      },
      tenant,
      workspace: workspace!,
    };
  }

  generateToken(user: UserRecord): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        workspaceId: user.workspace_id,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  verifyToken(token: string): {
    userId: string;
    email: string;
    role: UserRole;
    tenantId: string;
    workspaceId?: string;
  } {
    return jwt.verify(token, JWT_SECRET) as any;
  }
}
