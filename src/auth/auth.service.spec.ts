import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepo = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const mockJwtService = {
    sign: vi.fn().mockReturnValue('mock-token'),
  };

  const mockConfigService = {
    get: vi.fn().mockReturnValue(3600),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    vi.clearAllMocks();
  });

  describe('register', () => {
    const dto = { name: 'Test User', email: 'test@test.com', password: 'password123' };

    it('should register a new user and return tokens', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue({ id: 'uuid-1', ...dto });
      mockUserRepo.save.mockResolvedValue({ id: 'uuid-1', email: dto.email });

      const result = await service.register(dto);

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(mockUserRepo.create).toHaveBeenCalled();
      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        expiresIn: 3600,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'uuid-1', email: dto.email });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should hash the password before saving', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockImplementation((data) => data);
      mockUserRepo.save.mockResolvedValue({ id: 'uuid-1', email: dto.email });

      await service.register(dto);

      const createArg = mockUserRepo.create.mock.calls[0][0];
      expect(createArg.password).not.toBe(dto.password);
      const isHashed = await bcrypt.compare(dto.password, createArg.password);
      expect(isHashed).toBe(true);
    });
  });

  describe('login', () => {
    const dto = { email: 'test@test.com', password: 'password123' };

    it('should return tokens for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      mockUserRepo.findOne.mockResolvedValue({ id: 'uuid-1', email: dto.email, password: hashedPassword });

      const result = await service.login(dto);

      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        expiresIn: 3600,
      });
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'uuid-1', email: dto.email, password: 'wrong-hash' });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
