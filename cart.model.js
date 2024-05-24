import mongoose from "mongoose";
import CommunityModel from "./community.model.js";

const cartSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: [true, "clientId is required"],
      unique: true,
    },

    // artistId: {
    //   type: mongoose.Types.ObjectId,
    //   ref: "User",
    //   required: [true, "artistId is required"],
    // },
    communityProjects: {
      type: [
        {
          collectId: {
            type: mongoose.Types.ObjectId,
            //ref: "Community",
          },

          ProjectsPrice: {
            type: Number,
            ref: "Community",
          },
          cartType: {
            type: String,
            default: "ArtWork",
          },
        },
      ],
      _id: false,
    },
    courses: {
      type: [
        {
          courseId: {
            type: mongoose.Types.ObjectId,
            ref: "Course",
          },
          coursesPrice: {
            type: Number,
            required: true,
          },
          cartType: {
            type: String,
            default: "course",
          },
        },
      ],
      _id: false,
    },
    CourseQuantity: {
      type: Number,
      default: 1,
    },
    ProjectsQuantity: {
      type: Number,
      default: 1,
    },
    CoursesTotal: {
      type: Number,
      default: 0,
    },
    ProjectsTotal: {
      type: Number,
      default: 0,
    },
    TotalQuantity: {
      type: Number,
      default: 1,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// cartSchema
//   .path("communityProjects")
//   .schema.path("ProjectsPrice")
//   .get(function () {
//     return this.communityProjects.reduce(
//       (total, project) => total + (project.ProjectsPrice || 0),
//       0
//     );
//   });

// cartSchema
//   .path("courses")
//   .schema.path("coursesPrice")
//   .get(function () {
//     return this.courses.reduce(
//       (total, course) => total + (course.coursesPrice || 0),
//       0
//     );
//   });

// cartSchema.path("totalPrice").get(function () {
//   return this.communityProjects.ProjectsPrice + this.courses.coursesPrice;
// });
let collector = 0;
// cartSchema.pre("save", async function (next) {
//   this.communityProjects.ProjectsPrice = 0;
//   this.courses.coursesPrice = 0;
//   this.totalPrice = 0;
//   this.quantity = 0;

//   this.communityProjects.ProjectsPrice = this.priceCollector(
//     this.communityProjects.collectId
//   );
//   this.courses.coursesPrice = this.courses.reduce(
//     (total, course) => total + (course.coursesPrice || 0),
//     0
//   );
//   this.CoursesTotal = this.courses.coursesPrice;
//   this.ProjectsTotal = this.communityProjects.ProjectsPrice;
//   this.totalPrice =
//     this.communityProjects.ProjectsPrice + this.courses.coursesPrice;
//   this.CourseQuantity = this.courses.length;
//   this.ProjectsQuantity = this.communityProjects.length;

//   this.TotalQuantity = this.communityProjects.length + this.courses.length;
//   next();
// });
cartSchema.pre("save", async function (next) {
  try {
    // Resetting the prices and quantities
    this.CoursesTotal = 0;
    this.ProjectsTotal = 7;
    this.totalPrice = 0;
    this.CourseQuantity = this.courses.length;
    this.ProjectsQuantity = this.communityProjects.length;

    // Calculating total price for communityProjects

    // Calculating total price for courses
    for (const course of this.courses) {
      this.CoursesTotal += course.coursesPrice;
    }

    // Calculating total price for the cart
    this.totalPrice = this.ProjectsTotal + this.CoursesTotal;

    // Calculating total quantity for the cart
    this.TotalQuantity = this.CourseQuantity + this.ProjectsQuantity;

    next();
  } catch (error) {
    next(error);
  }
});

cartSchema.methods.priceCollector = async function (collectId) {
  try {
    // Find the community project based on the collectId
    const communityProject = await CommunityModel.findById(collectId);

    // If the community project is found, calculate the total price
    if (communityProject) {
      // Sum up the prices in the postCollection
      let totalPrice = 0;
      for (const collection of communityProject.postCollection) {
        totalPrice += collection.price || 0;
      }
      return totalPrice;
    }
    // If the community project is not found, return 0
    return 0;
  } catch (error) {
    console.error("Error in priceCollector:", error);
    throw error;
  }
};

const cartModel = mongoose.model("Cart", cartSchema);
export default cartModel;
