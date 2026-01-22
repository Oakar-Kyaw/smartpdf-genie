import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UseGuards,
  Req,
  Res,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  UpdateUserDto,
} from './dto/update-user.dto';

@Controller('api/v1/users')
//@UseGuards(AuthGuard) // Apply AuthGuard to all routes by default
export class UserController {
  constructor(
    private readonly userService: UserService,
    //private readonly fileUploadService: FileUpload,
  ) {}

  // @Post('device-token')
  // @ApiOperation({ summary: 'Sync device token' })
  // syncDeviceToken(@Body() dto: SyncDeviceTokenDto) {
  //   return this.userService.syncDeviceToken(dto);
  // }

  // @Post('device-token/mobile')
  // @ApiOperation({ summary: 'Sync device token' })
  // createAllDeviceToken(@Body() dto: SyncDeviceTokenDto) {
  //   return this.UserService.createDeviceToken(dto);
  // }

  // @Public()
  // @Serialize(CreatedUserResponseDto)
  //@UseInterceptors(FileInterceptor('photoUrl'))
  @Post()
  create(@Body() createUserWithProfileDto: CreateUserDto) {
    return this.userService.create(createUserWithProfileDto);
  }
  @Get()
  findAll(
    @Query()
    query: {
      search?: string;
      page?: string;
      pageSize?: string;
      from?: string;
      to?: string;
      order?: 'asc' | 'desc';
      isDeleted?: boolean;
    },
  ) {
    return this.userService.findAll(
     query
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    console.log('Fetching user with ID:', id);
    const user = await this.userService.findOne(id);
    console.log('User found:', user);
    return user;
  }

  //@UseInterceptors(FileInterceptor('photoUrl'))
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserWithProfileDto: UpdateUserDto,
  //  @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.update(id, updateUserWithProfileDto, 
    //  file
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }

  @Post('register/facebook/mobile')
  async facebookRegister(
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string,
    @Body('photoUrl') photoUrl: string,
    @Body('code') code: string,
  ) {
    return this.userService.facebookRegister({
      code: code,
      fristName: firstName,
      lastName: lastName,
      photoUrl: photoUrl,
    });
  }

  @Get('register/google/mobile')
  async googleRegister(@Query('code') code: string) {
    console.log('code', code);
    return this.userService.googleRegister(code);
  }

  @Post('photo')
 // @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
   // @UploadedFile() file: Express.Multer.File
  ) {
    //return this.fileUploadService.uploadSingle({ file, folderName: 'profile' });
  }

  @Get('forgot/otp')
  async sendOtp(@Query('email') email: string, @Query('mode') mode?: string) {
   // return this.userService.sendOtp({ email, mode });
  }

  @Post('otp/send')
  async sendOtpPost(
    //@Body() body: SendOtpDto
    ) {
   // return this.userService.sendOtp(body);
  }

  @Post('signup/otp')
  @UseInterceptors(
   // FileInterceptor('file')
  ) // Handle multipart/form-data
  async sendSignupOtp(
   // @Body() body: SendOtpDto
  ) {
   // return this.userService.sendOtp({ ...body, mode: 'signup' });
  }

  @Post('forgot/otp/verify')
  async verifyOtp(
   // @Body() body: VerifyOtpDto
  ) {
    // const otp = body.otp || body.code;
    // if (!otp) {
    //   throw new BadRequestException('OTP code is required');
    // }
    // return this.UserService.verifyOtp({ ...body, otp });
  }

  @Patch('password/change')
  async changePassword(
   // @Body() updatePasswordDto: UpdateUserPassword
  ) {
    //return this.userService.updatePassword(updatePasswordDto);
  }
}
