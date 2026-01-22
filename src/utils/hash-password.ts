import * as bcrypt from 'bcrypt';

const hashedPassword = async (password: string): Promise<string> => {
  const saltRound = 10;
  return await bcrypt.hash(password, saltRound);
};

const comparePassword = async (
  password: string,
  hashPassword,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashPassword);
};

export { hashedPassword, comparePassword };
