import dbConnect from "@/lib/dbConnect";
import UserModel from "@/models/User";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";

export async function POST(request: Request) {
  await dbConnect();
  try {
    const { username, email, password } = await request.json();
    const exisitngUserVerifiedByUsername = await UserModel.findOne({
      username,
      isVerified: true,
    });

    if (exisitngUserVerifiedByUsername) {
      return Response.json(
        { success: false, message: "Username already taken" },
        { status: 400 }
      );
    }

    const exisitngUserByEmail = await UserModel.findOne({
      email,
    });
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    if (exisitngUserByEmail) {
      if (exisitngUserByEmail.isVerified) {
        return Response.json(
          { success: false, message: "User already exists with this email" },
          { status: 400 }
        );
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        exisitngUserByEmail.password = hashedPassword;
        exisitngUserByEmail.verifyCode = verifyCode;
        exisitngUserByEmail.verifyCodeExpiry = new Date(Date.now() + 3600000);
        await exisitngUserByEmail.save();
      }
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1);

      const newUser = new UserModel({
        username,
        password: hashedPassword,
        email,
        verifyCode,
        verifyCodeExpiry: expiryDate,
        isVerified: false,
        isAcceptingMessages: true,
        messages: [],
      });
      await newUser.save();
    }
    const emailResponse = await sendVerificationEmail(
      email,
      username,
      verifyCode
    );
    if (!emailResponse.success) {
      return Response.json(
        {
          success: false,
          message: emailResponse.message,
        },
        { status: 500 }
      );
    }
    return Response.json(
      {
        success: true,
        message: "User registered successfully. Please verify your email",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.log("Error registering user", error);
    return Response.json(
      {
        success: false,
        message: "Error registering user",
      },
      {
        status: 500,
      }
    );
  }
}
