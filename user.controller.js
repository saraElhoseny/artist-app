import UserModel from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { globalToken } from "./auth.controller.js";
import { sendEmail } from "../services/sendEmail.js";
import jwt from "jsonwebtoken";
import CommunityModel from "../models/community.model.js";
import OrderModel from "../models/order.model.js";
import CourseModel from "../models/course.model.js";
import { Types } from "mongoose";
import { populate } from "dotenv";
import contractModel from "../models/contract.model.js";
import reportModel from "../models/report.model.js";

export const changePassword = async (req, res) => {
  let { currentPassword, Password, cpassword } = req.body;
  if (Password == cpassword) {
    let user = await UserModel.findById(req.user._id);
    let matched = await bcryptjs.compare(currentPassword, user.password);
    if (matched) {
      const hashed = await bcryptjs.hash(
        Password,
        parseInt(process.env.saltRounds)
      );
      const updatedUser = await UserModel.findByIdAndUpdate(
        req.user._id,
        { password: hashed },
        { new: true }
      );
      res.json({ message: "updated", updatedUser });
    } else {
      res.json({ message: "current password invalid" });
    }
  } else {
    res.json({ message: "password doesnt match" });
  }
};

export const getUserByID = async (req, res) => {
  const { id } = req.params;
  const UserID = await UserModel.findById({ _id: id });
  if (!UserID) {
    return res.status(404).json({ message: "No such user found." });
  }
  res.json({ Sucess: UserID, token: globalToken });
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find({ userType: { $nin: "Admin" } });
    if (!users) {
      return res.status(404).json({ message: "No such user found." });
    }
    res.json({ Sucess: users });
  } catch (error) {
    res.status(404).json({ message: "internal server error." });
    console.log(error);
  }
};

export const updateProfileInfo = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id);

    if ("username" in req.body) {
      if (req.body.username.length < 1 || req.body.username.length > 100) {
        return res.status(400).json({ error: "Invalid username length" });
      }
      user.username = req.body.username;
    }

    if ("profilePic" in req.body) {
      user.profilePic = req.body.profilePic;
    }

    if ("coverPic" in req.body) {
      user.coverPic = req.body.coverPic;
    }

    if ("hourlyRate" in req.body) {
      user.ArtistInfo[0].hourlyRate = req.body.hourlyRate;
    }

    if ("address" in req.body) {
      user.address = req.body.address;
    }

    if ("email" in req.body) {
      const existingUser = await UserModel.findOne({ email: req.body.email });
      if (existingUser && existingUser._id.toString() !== req.user._id) {
        return res.status(400).json({ error: "Email already in use" });
      } else {
        user.email = req.body.email;
      }
    }

    if ("category" in req.body) {
      const validDepartments = [
        "Landscape",
        "Calligraphy",
        "3D",
        "Anime/Manga",
        "Graffiti",
        "Digital",
        "Sketching",
        "Surreal",
        "abstract",
      ];

      if (!validDepartments.includes(req.body.category)) {
        return res.status(400).json({ error: "Invalid art category" });
      } else {
        user.ArtistInfo[0].departments = req.body.category;
      }
    }

    await user.save();
    return res
      .status(200)
      .json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
let reporter;
let reportFinder;
let contractIds = [];
export const report = async (req, res) => {
  const {
    contentType,
    description,
    contractId,
    courseId,
    postId,
    evimages,
    evText,
  } = req.body;

  try {
    let user = await UserModel.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "No such user found." });
    }

    if (contentType === "Contract") {
      if (!contractId) {
        return res.status(404).json({
          message: "please insert the ID of the content you wanna report",
        });
      }
      const contract = await contractModel.findOne({
        "artistContracts._id": contractId,
      });
      if (!contract) {
        return res.status(404).json({ message: "No such contract found." });
      }

      reporter = new reportModel({
        reporterId: req.user._id,
        contentType,
        reportDescription: description,
        ContractId: contract._id,
        ReportDate: Date.now(),
        seeClaims: [{ evimages, evText }],
      });
      await reporter.save();
      reportFinder = await reportModel
        .findOne({
          reporterId: req.user._id,
          contentType,
          reportDescription: description,
          ContractId: contract._id,
          ReportDate: { $gte: Date.now() - 5000 },
        })
        .populate([
          {
            path: "reporterId",
            select: "username profilePic",
          },
          {
            path: "ContractId",
            populate: {
              path: "artistId",
              select: "username profilePic",
            },
          },
        ]);
      if (reportFinder) {
        const contract = reportFinder.ContractId.artistContracts.find(
          (contract) => contract._id.toString() === contractId
        );

        reportFinder.ContractId.artistContracts = contract ? [contract] : [];
      }
      contractIds.push(contractId);
    } else if (contentType === "Community") {
      if (!postId) {
        return res.status(404).json({
          message: "please insert the ID of the content you wanna report pp",
        });
      }

      const post = await CommunityModel.findById(postId).populate("author");
      if (!post) {
        return res.status(404).json({ message: "No such post found." });
      }
      reporter = new reportModel({
        reporterId: req.user._id,
        contentType,
        reportDescription: description,
        CommunityId: postId,
        ReportDate: Date.now(),
        seeClaims: [{ evimages, evText }],
      });
      await reporter.save();
      reportFinder = await reportModel
        .findOne({
          reporterId: req.user._id,
          contentType,
          reportDescription: description,
          CommunityId: postId,
          ReportDate: { $gte: Date.now() - 5000 },
        })
        .populate([
          {
            path: "reporterId",
            select: "username profilePic",
          },
          {
            path: "CommunityId",
            populate: {
              path: "author",
              select: "username profilePic",
            },
          },
        ]);
    } else if (contentType === "Course") {
      if (!courseId) {
        return res.status(404).json({
          message: "please insert the ID of the content you wanna report",
        });
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: "No such course found." });
      }
      reporter = new reportModel({
        reporterId: req.user._id,
        contentType,
        reportDescription: description,
        CourseId: courseId,
        ReportDate: Date.now(),
        seeClaims: [{ evimages, evText }],
      });
      await reporter.save();
      reportFinder = await reportModel
        .findOne({
          reporterId: req.user._id,
          contentType,
          reportDescription: description,
          CourseId: courseId,
          ReportDate: { $gte: Date.now() - 5000 },
        })
        .populate([
          {
            path: "reporterId",
            select: "username profilePic",
          },
          {
            path: "CourseId",
            populate: {
              path: "artistId",
              select: "username profilePic",
            },
          },
        ]);
    } else {
      return res.status(404).json({ message: "No such content found." });
    }

    if (!reportFinder) {
      return res.status(404).json({ message: "No such report found." });
    }
    res
      .status(201)
      .json({ message: "report added Successfully", Success: reportFinder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllReports = async (req, res) => {
  try {
    const { contractId } = req; // Accessing contractId from req
    console.log(contractId);
    const reports = await reportModel.find({}).populate([
      {
        path: "reporterId",
        select: "username profilePic",
      },
      {
        path: "CommunityId",
        populate: { path: "author" },
      },
      {
        path: "ContractId",
        populate: {
          path: "artistId",
          select: "username profilePic",
        },
      },
      {
        path: "CourseId",
        populate: {
          path: "artistId",
          select: "username profilePic",
        },
      },
    ]);

    if (!reports) {
      return res.status(404).json({ message: "No reports found" });
    }
    console.log(contractIds);
    reports.map((report) => {
      if (report.ContractId && report.ContractId.artistContracts) {
        let contract;
        for (const contractId of contractIds) {
          contract = report.ContractId.artistContracts.find(
            (contract) => contract._id.toString() === contractId
          );
        }
        report.ContractId.artistContracts = contract ? [contract] : [];
      }
    });

    return res.status(200).json({ message: "successful", Reports: reports });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllArtists = async (req, res) => {
  try {
    const artists = await UserModel.find({ userType: "Artist" });
    if (!artists) {
      return res.status(404).json({ message: "No artists found" });
    }
    return res.status(200).json({ message: "successful", Artists: artists });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const userBlocker = async (req, res) => {
  const { id } = req.params;
  const user = await UserModel.findOne({ _id: id });
  if (!user) {
    return res
      .status(404)
      .json({ message: "No such user found or the user is already blocked" });
  }
  if (user.userType === "Admin") {
    return res.status(404).json({ message: "You cannot block an admin" });
  }
  user.blocked = true;
  const blocker = await user.save();
  res.json({ message: "Successfully Blocked", Success: true, blocker });
};

export const userUpgrader = async (req, res) => {
  const { id } = req.params;
  let user;

  try {
    user = await UserModel.findById(id);

    if (!user) {
      return res.status(404).json({ message: "No such user found." });
    }

    if (user.userType === "Admin") {
      return res.status(400).json({ message: "User is already an admin" });
    }

    // Upgrade user to Admin
    user.userType = "Admin";

    // Set isAccepted to true
    user.isAccepted = true;

    // Save changes
    const upgradedUser = await user.save();

    return res.json({
      message: "Successfully Upgraded",
      success: true,
      user: upgradedUser,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// export const adminChecker = async (req, res) => {
//   const { id } = req.params;
//   const user = await UserModel.findOne({ _id: id, isAccepted: false });
//   if (!user) {
//     return res.status(404).json({
//       message: "No such user found or the  account is already approved",
//     });
//   }
//   if (user.userType !== "Admin") {
//     return res.status(404).json({ message: "User is not an admin" });
//   }
//   user.isAccepted = true;
//   const savedAdmin = await user.save();
//   return res
//     .status(200)
//     .json({ message: "Successful", Success: true, data: savedAdmin });
// };
