import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TokenCipherService } from '../common/crypto/token-cipher.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CreateProviderMappingDto } from './dto/create-provider-mapping.dto';
import { UpdateProviderMappingDto } from './dto/update-provider-mapping.dto';

// The encrypted apiKeySecret is never selected into a response — only
// whether one is configured is exposed.
const PROVIDER_SELECT = {
  id: true,
  name: true,
  code: true,
  apiEndpoint: true,
  isActive: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProviderSelect;

type ProviderView = Prisma.ProviderGetPayload<{ select: typeof PROVIDER_SELECT }> & {
  hasApiKey: boolean;
};

function assertQuantityRangeIsValid(minQuantity?: number, maxQuantity?: number): void {
  if (minQuantity !== undefined && maxQuantity !== undefined && minQuantity > maxQuantity) {
    throw new BadRequestException('minQuantity cannot be greater than maxQuantity');
  }
}

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: TokenCipherService,
  ) {}

  // ---- Provider CRUD (admin) ----

  async create(dto: CreateProviderDto): Promise<ProviderView> {
    const existing = await this.prisma.provider.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException('A provider with this code already exists');
    }

    const created = await this.prisma.provider.create({
      data: {
        name: dto.name,
        code: dto.code,
        apiEndpoint: dto.apiEndpoint,
        apiKeySecret: dto.apiKey ? this.cipher.encrypt(dto.apiKey) : null,
        isActive: dto.isActive ?? true,
      },
      select: { ...PROVIDER_SELECT, apiKeySecret: true },
    });
    return this.toView(created);
  }

  async list(): Promise<ProviderView[]> {
    const providers = await this.prisma.provider.findMany({
      select: { ...PROVIDER_SELECT, apiKeySecret: true },
      orderBy: { createdAt: 'desc' },
    });
    return providers.map((provider) => this.toView(provider));
  }

  async get(id: string): Promise<ProviderView> {
    return this.toView(await this.findOrThrow(id));
  }

  async update(id: string, dto: UpdateProviderDto): Promise<ProviderView> {
    await this.findOrThrow(id);

    const updated = await this.prisma.provider.update({
      where: { id },
      data: {
        name: dto.name,
        apiEndpoint: dto.apiEndpoint,
        apiKeySecret: dto.apiKey !== undefined ? this.cipher.encrypt(dto.apiKey) : undefined,
        isActive: dto.isActive,
        status: dto.status,
      },
      select: { ...PROVIDER_SELECT, apiKeySecret: true },
    });
    return this.toView(updated);
  }

  /** Internal use only (dispatch pipeline) — includes the decrypted key. */
  async resolveCredentials(id: string): Promise<{ apiEndpoint: string | null; apiKey: string | null }> {
    const provider = await this.findOrThrow(id);
    return {
      apiEndpoint: provider.apiEndpoint,
      apiKey: provider.apiKeySecret ? this.cipher.decrypt(provider.apiKeySecret) : null,
    };
  }

  // ---- Service mapping CRUD (admin) ----

  async createMapping(dto: CreateProviderMappingDto) {
    await this.findOrThrow(dto.providerId);

    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    assertQuantityRangeIsValid(dto.minQuantity, dto.maxQuantity);

    const existing = await this.prisma.providerServiceMapping.findUnique({
      where: { providerId_serviceId: { providerId: dto.providerId, serviceId: dto.serviceId } },
    });
    if (existing) {
      throw new ConflictException('A mapping for this provider and service already exists');
    }

    return this.prisma.providerServiceMapping.create({
      data: {
        providerId: dto.providerId,
        serviceId: dto.serviceId,
        providerServiceId: dto.providerServiceId,
        providerPricePerThousand:
          dto.providerPricePerThousand !== undefined
            ? new Prisma.Decimal(dto.providerPricePerThousand)
            : undefined,
        minQuantity: dto.minQuantity,
        maxQuantity: dto.maxQuantity,
        active: dto.active ?? true,
      },
    });
  }

  async listMappings(providerId?: string) {
    return this.prisma.providerServiceMapping.findMany({
      where: providerId ? { providerId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMapping(id: string) {
    return this.findMappingOrThrow(id);
  }

  async updateMapping(id: string, dto: UpdateProviderMappingDto) {
    const mapping = await this.findMappingOrThrow(id);
    assertQuantityRangeIsValid(
      dto.minQuantity ?? mapping.minQuantity ?? undefined,
      dto.maxQuantity ?? mapping.maxQuantity ?? undefined,
    );

    return this.prisma.providerServiceMapping.update({
      where: { id },
      data: {
        providerServiceId: dto.providerServiceId,
        providerPricePerThousand:
          dto.providerPricePerThousand !== undefined
            ? new Prisma.Decimal(dto.providerPricePerThousand)
            : undefined,
        minQuantity: dto.minQuantity,
        maxQuantity: dto.maxQuantity,
        active: dto.active,
      },
    });
  }

  private async findOrThrow(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      select: { ...PROVIDER_SELECT, apiKeySecret: true },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    return provider;
  }

  private async findMappingOrThrow(id: string) {
    const mapping = await this.prisma.providerServiceMapping.findUnique({ where: { id } });
    if (!mapping) {
      throw new NotFoundException('Provider service mapping not found');
    }
    return mapping;
  }

  private toView(
    provider: Prisma.ProviderGetPayload<{ select: typeof PROVIDER_SELECT }> & { apiKeySecret: string | null },
  ): ProviderView {
    const { apiKeySecret, ...rest } = provider;
    return { ...rest, hasApiKey: apiKeySecret !== null };
  }
}
