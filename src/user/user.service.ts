import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as firebaseAdmin from 'firebase-admin';
import { hashedPassword } from 'src/utils/hash-password';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(
    //private readonly uploadFile: FileUpload,
    private readonly prisma: PrismaService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    console.log(
      'UserService.create called with:',
      JSON.stringify(createUserDto, null, 2),
    );
    const { email, phone } = createUserDto;
    // Check if email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
      console.warn(`User with email ${email} or phone ${phone} already exists`);
      throw new ConflictException('Email or phone already exists');
    }

    let hashPassword = '';
    if (createUserDto.password) {
      hashPassword = await hashedPassword(createUserDto.password);
    }
    delete createUserDto.otp;

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashPassword,
      },
    });

    console.log('User created in DB:', user);

    //send welcome message
    let subject = 'Welcome to Our Platform!';
    let htmlContent = '';
    const fullName =
      [createUserDto.firstName, createUserDto.lastName]
        .filter(Boolean)
        .join(' ') || 'User';

    // if (dto.role === RoleEnum.SALE) {
    //   subject = 'Welcome to Our Brand Provider Network!';
    //   htmlContent = `
    //     <div style="font-family: Arial, sans-serif; color: #333;">
    //       <h1 style="color: #4CAF50;">Welcome, ${fullName}!</h1>
    //       <p>We are thrilled to have you join us as a Brand Provider.</p>
    //       <p>Your account has been successfully created. You can now start managing your brand and products on our platform.</p>
    //       <p>Here are your next steps:</p>
    //       <ul>
    //         <li>Complete your brand profile</li>
    //         <li>Upload your product catalog</li>
    //         <li>Review your dashboard</li>
    //       </ul>
    //       <p>We look forward to a successful partnership!</p>
    //       <p style="margin-top: 20px;">— Megasmart Team</p>
    //     </div>
    //   `;
    // } else {
    //   htmlContent = `
    //     <div style="font-family: Arial, sans-serif; color: #333;">
    //       <h1 style="color: #4CAF50;">Welcome, ${fullName}!</h1>
    //       <p>Thank you for joining our platform. We are excited to have you on board!</p>
    //       <p>Here is a quick tip to get started:</p>
    //       <ul>
    //         <li>Set up your profile</li>
    //         <li>Check out the latest features</li>
    //       </ul>
    //       <p>We are here to help anytime. Enjoy your journey with us!</p>
    //       <p style="margin-top: 20px;">— Mega Smart Cart Team</p>
    //     </div>
    //   `;
    // }
    // await publishEvent(EVENTS.USER_EVENT, {
    //   type: TYPES.CREATED_USER,
    //   id: user.id,
    //   email: user.email,
    //   phone: user.phone,
    //   role: user.role,
    //   password: hashPassword,
    // });

    // await publishEvent(EVENTS.NOTI_EVENT, {
    //   type: TYPES.SEND_EMAIL,
    //   to: email,
    //   subject: subject,
    //   html: htmlContent,
    // });

    return {
      success: true,
      message: 'CREATED_USER',
      data: user,
    };
  }

  async findAll(query: {
    isDeleted?: boolean;
    email?: string;
    phone?: string;
    //role?: RoleEnum;
    search?: string;
    page?: string;
    pageSize?: string;
    from?: string;
    to?: string;
    startDate?: string;
    endDate?: string;
    order?: 'asc' | 'desc';
  }) {
    const where: any = { isDeleted: false };
    if (query?.isDeleted !== undefined) where.isDeleted = query.isDeleted;
    // if (query?.role) {
    //   const r = query.role?.toUpperCase();
    //   where.role = r === 'USER' ? 'CUSTOMER' : r;
    // }
    if (query?.email) where.email = query.email;
    if (query?.phone) where.phone = query.phone;

    if (query?.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const qFrom = query?.from ?? query?.startDate;
    const qTo = query?.to ?? query?.endDate;
    if (qFrom || qTo) {
      const createdAt: { gte?: Date; lte?: Date } = {};
      if (qFrom) createdAt.gte = new Date(qFrom);
      if (qTo) {
        const end = new Date(qTo);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }

    const order = query?.order === 'asc' ? 'asc' : 'desc';
    const page = query?.page ? Number(query.page) : undefined;
    const pageSize = query?.pageSize ? Number(query.pageSize) : undefined;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { id: order },
        // skip: meta.skip,
        // take: meta.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      success: true,
      message: 'USER_BY_ID',
      data: users,
    };
  }

  // async sendOtp({ email, mode }: { email: string; mode?: string }) {
  //   if (!email) throw new NotFoundException('EMAIL_REQUIRED');
  //   const otp = Math.floor(100000 + Math.random() * 900000).toString();
  //   console.log(`DEBUG OTP for ${email}: ${otp}`);
  //   const key = `otp:${mode || 'signup'}:${email}`;
  //   await this.redis.set(key, otp, 'EX', 300);
  //   try {
  //     await publishEvent(EVENTS.NOTI_EVENT, {
  //       type: TYPES.SEND_EMAIL,
  //       to: email,
  //       subject: 'Your verification code',
  //       html: `<p>Your verification code is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
  //     });
  //   } catch (err) {
  //     console.error('OTP email send failed', err);
  //     // Continue returning success so the user can verify with the stored OTP
  //   }
  //   return { success: true, message: 'OTP_SENT' };
  // }

  // async verifyOtp(dto: VerifyOtpDto) {
  //   const { email, mode, otp } = dto;
  //   console.log('Verifying OTP with DTO:', JSON.stringify(dto, null, 2));

  //   if (!email || !otp) throw new NotFoundException('EMAIL_AND_OTP_REQUIRED');

  //   // If signup mode and registration data is present (password is a good indicator), create the user immediately
  //   if ((mode === 'signup' || !mode) && dto.password) {
  //     console.log('Attempting to create user during OTP verification...');

  //     // We check OTP existence here to fail fast, but let create() handle the final verification and deletion
  //     const key = `otp:signup:${email}`;
  //     const stored = await this.redis.get(key);
  //     console.log(
  //       `Checking Redis Key: ${key}, Stored: ${stored}, Provided: ${otp}`,
  //     );

  //     if (!stored) throw new NotFoundException('OTP_EXPIRED_OR_NOT_FOUND');
  //     if (stored !== otp) throw new UnauthorizedException('INVALID_OTP');

  //     // Map to CreateUserDto
  //     const createUserDto: CreateUserDto = {
  //       email,
  //       password: dto.password,
  //       role: dto.role || RoleEnum.CUSTOMER,
  //       firstName: dto.firstName,
  //       lastName: dto.lastName,
  //       gender: dto.gender,
  //       phone: dto.phone,
  //       identification: dto.identification,
  //       dateOfBirth: dto.dateOfBirth,
  //       brandId: dto.brandId,
  //       otp: otp, // Pass OTP so create method can verify and delete it
  //     };

  //     console.log(
  //       'Calling create() with:',
  //       JSON.stringify(createUserDto, null, 2),
  //     );

  //     try {
  //       // This will create user in User DB and publish event for Auth DB
  //       const result = await this.create(createUserDto);
  //       console.log('User creation result:', result);
  //       return result;
  //     } catch (error) {
  //       console.error('Error creating user during OTP verification:', error);
  //       throw error;
  //     }
  //   }

  //   // If we are here, it means we are just verifying OTP without creating user (e.g. forgot password flow, or legacy signup flow)
  //   const key = `otp:${mode || 'signup'}:${email}`;
  //   const stored = await this.redis.get(key);
  //   console.log('otp', otp, key, stored);
  //   if (!stored) throw new NotFoundException('OTP_EXPIRED_OR_NOT_FOUND');
  //   if (stored !== otp) throw new UnauthorizedException('INVALID_OTP');

  //   // If it's signup mode but no password, we just delete OTP and return success.
  //   // This allows the client to call signup() separately (if that flow exists)
  //   // BUT the client must provide the OTP again to signup() which will fail if we delete it here.
  //   // So for signup mode, we should NOT delete it if we expect a follow-up signup call.
  //   if (mode === 'signup' || !mode) {
  //     // Do not delete key for signup mode, so the subsequent create() call can verify it.
  //     // However, this opens a window where OTP can be reused or brute forced if not careful.
  //     // But since create() deletes it, it should be fine for the short duration.
  //     return { success: true, message: 'OTP_VERIFIED' };
  //   }

  //   await this.redis.del(key);
  //   return { success: true, message: 'OTP_VERIFIED' };
  // }

  async findOne(id: number, host?: 'http' | 'tcp') {
    if (!Number.isInteger(id)) {
      throw new NotFoundException('INVALID_USER_ID');
    }
    console.log('user found', id);
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    // If found, return success object
    return {
      success: true,
      message: 'USER_BY_ID',
      data: user,
    };
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    // file: Express.Multer.File,
  ) {
    let imageUrl;
    const existingUser = await this.prisma.user.findUnique({
      where: { id, isDeleted: false },
    });

    if (!existingUser)
      throw new NotFoundException(`User with ID ${id} not found`);

    const existingOtherUser = await this.prisma.user.findFirst({
      where: { NOT: { id }, email: updateUserDto.email },
    });

    // if (file)
    //   imageUrl = (
    //     await this.uploadFile.uploadSingle({ file, folderName: 'profile' })
    //   ).url;

    console.log(
      'existing other user',
      existingOtherUser,
      'photo url',
      imageUrl,
    );

    if (existingOtherUser)
      throw new ConflictException(
        `User with this ${updateUserDto.email} already exist in other account.`,
      );

    if (updateUserDto.password)
      updateUserDto.password = await hashedPassword(updateUserDto.password);

    // const updateRole = dto['role'] === 'USER' ? 'CUSTOMER' : dto['role'];
    const updateUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        // ...(file ? { photoUrl: imageUrl } : {}),
        // ...(dto['role'] ? { role: updateRole } : {}),
      },
    });
    // await publishEvent(EVENTS.USER_EVENT, {
    //   type: TYPES.UPDATED_USER,
    //   id: updateUser.id,
    //   email: updateUser.email,
    //   phone: updateUser.phone,
    //   role: updateUser.role ?? 'CUSTOMER',
    //   password: updateUser.password ?? null,
    // });

    return {
      success: true,
      message: 'UPDATED_USER',
      data: updateUser,
    };
  }

  async remove(id: number) {
    const userExists = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!userExists) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.$transaction(async (prisma) => {
      // Delete brand user relationships
      // Finally, soft-delete the user itself
      const deletedUser = await prisma.user.update({
        where: { id },
        data: { isDeleted: true },
      });
      // await publishEvent(EVENTS.USER_EVENT, {
      //   type: TYPES.DELETED_USER,
      //   id: deletedUser.id,
      //   email: deletedUser.email,
      //   phone: deletedUser.phone,
      //   role: deletedUser.role ?? 'CUSTOMER',
      //   password: deletedUser.password ?? null,
      // });

      return {
        success: true,
        message: 'DELETE_USER_BY_ID',
        data: deletedUser,
      };
    });
  }

  getAuthClient() {
    const authClient = new OAuth2Client(
      process.env.GOOGLE_ANDROID_CLIENTID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_USER_CALLBACK_URL,
      // envConfig().GOOGLE_ANDROID_CLIENTID,
      // envConfig().GOOGLE_CLIENT_SECRET,
      // envConfig().GOOGLE_USER_CALLBACK_URL,
    );
    return authClient;
  }

  async googleAuthUrl(deviceId?: string) {
    const authClient = this.getAuthClient();
    console.log('google clien', authClient);
    const authUrl = authClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['email', 'profile'],
      prompt: 'consent',
      include_granted_scopes: true,
    });
    console.log('auth url ', authUrl, deviceId);
    // const url =  `${authUrl}?deviceId=${deviceId ?? deviceId }`
    const url = authUrl;
    return { url };
  }

  async googleAuthClientData(code: string) {
    const authClient = this.getAuthClient();
    const tokenData = await authClient.getToken(code);
    const tokens = tokenData.tokens;
    console.log('tokens: ', tokens);

    authClient.setCredentials(tokens);

    const googleAuth = google.oauth2({
      version: 'v2',
      auth: authClient,
    } as any);

    const userInfo = await googleAuth.userinfo.get();
    console.log('user info:', userInfo);

    return { userData: userInfo.data };
  }

  async googleRegister(idToken: string) {
    const client = new OAuth2Client();
    //  envConfig().GOOGLE_ANDROID_CLIENTID
    // console.log(envConfig().GOOGLE_ANDROID_CLIENTID, 'client');
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: [
        // envConfig().GOOGLE_ANDROID_CLIENTID as string,
        // envConfig().GOOGLE_IOS_CLIENTID as string,
      ],
    });
    const payload = ticket?.getPayload();
    //console.log('payload', ticket, payload, payload?.picture);
    return this.saveGoogleUser(payload);
  }

  async facebookRegister({
    fristName,
    lastName,
    photoUrl,
    code,
  }: {
    code: string;
    fristName?: string;
    lastName?: string;
    photoUrl?: string;
  }) {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(code);
    console.log('de', decodedToken);
    const uid = decodedToken.uid;
    const name = decodedToken.name;
    const email = decodedToken.email;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser)
      return {
        success: false,
        message: 'User already existed.',
      };

    const user = await this.prisma.user.create({
      data: {
        email: email!,
        firstName: fristName ?? name,
        lastName: lastName ?? '',
        photoUrl: photoUrl,
      },
    });

    // await publishEvent(EVENTS.USER_EVENT, {
    //   type: TYPES.CREATED_USER,
    //   id: user.id,
    //   password: null,
    //   email: user.email,
    //   phone: user?.phone ?? null,
    //   role: 'CUSTOMER',
    //   provider: 'FACEBOOK',
    //   providerUserId: uid,
    // });

    return {
      success: true,
      message: 'User has been created successfully.',
      data: user,
    };
  }

  async saveGoogleUser(userData, deviceId?: string) {
    const { email, given_name, family_name, picture } = userData;
    console.log('email: ', userData, deviceId);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    console.log('existingUser: ', existingUser);
    if (existingUser)
      return {
        success: false,
        message: 'User already existed.',
        // data: user,
      };
    const user = await this.prisma.user.create({
      data: {
        email: email,
        firstName: given_name,
        lastName: family_name,
        photoUrl: picture,
      },
    });

    // await publishEvent(EVENTS.USER_EVENT, {
    //   type: TYPES.CREATED_USER,
    //   id: user.id,
    //   password: null,
    //   email: user.email,
    //   phone: user?.phone ?? null,
    //   role: 'CUSTOMER',
    //   provider: 'GOOGLE',
    // });
    console.log('user is: ', user);
    return {
      success: true,
      message: 'User has been created successfully.',
      data: user,
    };
  }

  async registerFacebookUser(data) {
    console.log('facebook user data: ', data);
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email, isDeleted: false },
    });
    if (existingUser)
      throw new ConflictException(
        `User with this email ${data.email} already exists.`,
      );
    if (data?.birthday)
      data.dateOfBirth = new Date(data.birthday).toISOString();
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        photoUrl: data.photoUrl,
        dateOfBirth: data.dateOfBirth ?? null,
        gender: data?.gender?.toUpperCase() ?? null,
      },
    });
    console.log('user: ', user);
    return {
      success: true,
      message: 'CREATED_USER',
      data: user,
    };
  }

  async removeByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return this.remove(user.id);
  }

  // async syncDeviceToken(dto: SyncDeviceTokenDto) {
  //   const { userId, deviceToken, action, deviceInfo } = dto;
  //   const user = await this.prisma.user.findUnique({ where: { id: userId } });
  //   if (!user) {
  //     throw new NotFoundException(`User #${userId} not found`);
  //   }

  //   const tokens = user.device_tokens || [];
  //   if (action === SyncAction.ADD) {
  //     // 1. Add to User.device_tokens if not present
  //     if (!tokens.includes(deviceToken)) {
  //       await this.prisma.user.update({
  //         where: { id: userId },
  //         data: { device_tokens: { push: deviceToken } },
  //       });
  //     }

  //     // 2. Upsert DeviceInfo
  //     if (deviceInfo) {
  //       await this.prisma.deviceInfo.upsert({
  //         where: { deviceToken },
  //         update: {
  //           ...deviceInfo,
  //           lastActive: new Date(),
  //         },
  //         create: {
  //           ...deviceInfo,
  //           userId,
  //           deviceToken,
  //         },
  //       });
  //     }
  //   } else if (action === SyncAction.REMOVE) {
  //     // 1. Remove from User.device_tokens
  //     const newTokens = tokens.filter((t) => t !== deviceToken);
  //     if (newTokens.length !== tokens.length) {
  //       await this.prisma.user.update({
  //         where: { id: userId },
  //         data: { device_tokens: newTokens },
  //       });
  //     }

  //     // 2. Remove DeviceInfo
  //     await this.prisma.deviceInfo.deleteMany({
  //       where: { deviceToken },
  //     });
  //   }

  //   return { success: true };
  // }

  // async createDeviceToken(dto: SyncDeviceTokenDto) {
  //   const { userId, deviceToken, email, action } = dto;
  //   if (action === SyncAction.ADD) {
  //     const created = await this.prisma.deviceInfo.upsert({
  //       where: { deviceToken },

  //       update: {
  //         userId: userId ?? null,
  //         email: email ?? null,
  //         deviceToken: deviceToken,
  //         lastActive: new Date(),
  //       },

  //       create: {
  //         ...(userId && { userId }),
  //         email: email ?? null,
  //         deviceToken: deviceToken,
  //         lastActive: new Date(),
  //       },
  //     });
  //     //publish to device token server
  //     await publishEvent(EVENTS.DEVICE_TOKEN, {
  //       type: TYPES.CREATE_DEVICE_TOKEN,
  //       userId: userId,
  //       email: email,
  //       deviceToken: deviceToken,
  //     });
  //   } else if (action === SyncAction.REMOVE) {
  //     const deleteToken = await this.prisma.deviceInfo.deleteMany({
  //       where: {
  //         deviceToken,
  //       },
  //     });
  //     //publish to device token server
  //     await publishEvent(EVENTS.DEVICE_TOKEN, {
  //       type: TYPES.DELETED_DEVICE_TOKEN,
  //       deviceToken: deviceToken,
  //     });
  //   }
  //   return { success: true };
  // }

  async updatePassword(body) {
    const { id, password } = body;
    console.log('password', password);
    const hashPassword = await hashedPassword(password);
    const updateUser = await this.prisma.user.update({
      where: { id: Number(id) },
      data: {
        password: hashPassword,
      },
    });

    //publish to auth server
    // await publishEvent(EVENTS.USER_EVENT, {
    //   type: TYPES.UPDATED_USER,
    //   id: updateUser.id,
    //   email: updateUser.email,
    //   phone: updateUser.phone ?? null,
    //   password: hashPassword ?? null,
    //   role: updateUser.role ?? 'CUSTOMER',
    // });
    return {
      success: true,
      message: 'PASSWORD_UPDATED_SUCCESSFULLY',
    };
  }
  removeEmptyFields<T extends Record<string, any>>(obj: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(obj).filter(
        ([_, value]) => value !== null && value !== undefined && value !== '',
      ),
    ) as Partial<T>;
  }
}
