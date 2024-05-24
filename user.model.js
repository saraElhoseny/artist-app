import mongoose from "mongoose";

import { roles } from "../middlewares/auth.js";
// const portfolio = mongoose.Schema({
//   artWork: {
//     type: String,
//   },
//   title: {
//     type: String,
//     required: true,
//   },
// });

// const artistInfo = mongoose.Schema({
//   departments: {
//     type: String,
//     enums: ["digital art", "manga", "anime", "3D"],
//     portfolio: portfolio,
//     bio: {
//       type: String,
//     },
//     rate: {
//       type: Number,
//       default: 0,
//     },
//   },
// });

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "username required"],
      min: [1, "min length one character"],
      max: [100, "max length is 100 characters"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    // confirm_email: {
    //   type: Boolean,
    //   default: false,
    // },
    active: {
      type: Boolean,
      default: false,
    },
    profilePic: {
      type: String,
      default:
        "https://img.freepik.com/free-photo/portrait-happy-smiley-man_23-2149022627.jpg?t=st=1711052840~exp=1711056440~hmac=f73293ca3dbfe9e862725f36b9da8c1ac552a614a44eb68f51ddcc07e82a2d42&w=2000",
    },
    coverPic: {
      type: String,
      default: "https://avatarfiles.alphacoders.com/358/358727.jpg",
    },
    userType: {
      type: String,
      enums: ["Admin", "Artist", "Client"],
      required: true,
    },
    enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    address: {
      type: String,
      required: true,
      //default : null
    },
    ArtistInfo: {
      _id: false,
      type: [
        {
          departments: {
            type: String,
            enum: [
              "Landscape",
              "Calligraphy",
              "3D",
              "Anime/Manga",
              "Graffiti",
              "Digital",
              "Sketching",
              "Surreal",
              "abstract",
            ],
          },
          bio: {
            type: String,
          },
          hourlyRate: {
            type: String,
            default: 0,
          },
          artistLevel: {
            type: String,
            enum: ["Beginner", "Intermediate", "professional"],
            default: "Beginner",
          },
          ordersCount: {
            type: String,
            default: 0,
          },
          hourlyRate: String,
        },
      ],
      default: null,
      required: function () {
        return this.userType === roles.Artist;
      },
    },
    // code: {
    //   type: String,
    //   default: null,
    // },

    blocked: {
      type: Boolean,
      default: false,
    },
    isAccepted: {
      type: Boolean,
      default: false,
      required: function () {
        return this.userType === roles.Admin;
      },
    },
    enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  },
  {
    timestamps: true,
  }
);

// userSchema.pre("save", async function (next) {
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// userSchema.methods.validatePassword = async function (reqPassword) {
//   return await bcrypt.compare(reqPassword, this.password);
// };

const UserModel = mongoose.model("User", userSchema);
export default UserModel;
