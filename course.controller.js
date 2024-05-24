import CourseModel from "../models/course.model.js";
import { paginate } from "../services/pagination.js";
import UserModel from "../models/user.model.js";
import cartModel from "../models/cart.model.js";
import { payment } from "./payment.controller.js";
//import UserModel from "../models/user.model";

export const addCourse = async (req, res, next) => {
  try {
    if (!req.body || !req.body.title || !req.body.video) {
      return res
        .status(422)
        .json({ message: "You have to provide both title and video" });
    } else {
      let {
        title,
        imageUrl,
        video,
        description,
        category,
        price,
        requirements,
        duration,
      } = req.body;
      // Assuming you want to save the course with the provided name, image URL, current user ID, and category ID
      if (!imageUrl) {
        imageUrl = 'https://img.freepik.com/premium-vector/painting-flat-illustration-with-someone-who-paints-using-easel-canvas-brushes-watercolor_2175-3936.jpg?w=996'; // Replace 'default_image_url.jpg' with your desired default image URL
      }

      let course = new CourseModel({
        title,
        description,
        imageUrl,
        video,
        artistId: req.user._id, // Assuming you have user information attached to the request object
        category,
        price,
        requirements,
        duration,
      });
      let savedcourse = await course.save();
      res.status(201).json({ message: "course created", course: savedcourse });
    }
  } catch (error) {
    // If there's an error during the process, return a 500 error response
    res.status(500).json({ message: "Error creating course", error: error.message });
      
      
  }
};

export const updateCourse = async (req, res) => {
  try {
    let { courseid } = req.params;
    let { title, imageUrl, duration, description } = req.body; // Assuming imgUrl is sent in the request body

    let course = await CourseModel.findById(courseid);

    if (!course) {
      return res.status(404).json({ message: "course not found" });
    }
    if (course.artistId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    let updatedcourse;
    if (imageUrl) {
      // If imgUrl is provided in the request body, update the image URL
      updatedcourse = await CourseModel.findByIdAndUpdate(
        { _id: courseid },
        { title, imageUrl, duration, description }, // Update the image field with the provided imgUrl
        { new: true }
      );
    } else {
      // If imgUrl is not provided, update only the name
      updatedcourse = await CourseModel.findByIdAndUpdate(
        { _id: courseid },
        { title, duration, description },
        { new: true }
      );
    }

    res.status(200).json({ message: "Updated", updatedcourse });
  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
    console.log(error);
  }
};
export const deletecourse = async (req, res) => {
  try {
    let { courseid } = req.params;

    // Find the course by its ID
    let course = await CourseModel.findById(courseid);

    // Check if the course exists
    if (!course) {
      return res.status(404).json({ message: "course not found" });
    }
    if (course.artistId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete the course
    await CourseModel.findByIdAndDelete(courseid);

    res.status(200).json({ message: "course deleted", deletedCourse: course });
  } catch (error) {
    res.status(500).json({ message: "Error deleting subcategory", error: error.message });
      
          console.error(error);
  }
};



export const courseRate = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { rate } = req.body;
    const clientId = req.user.id;

    // Check if the user has successfully completed the payment for the course
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }
    
    // Check if the user has successfully completed the payment for the course
    if (!course.successPayment || !course.enrolledStudents.includes(clientId)) {
      return res.status(403).json({ error: "You have not purchased this course. Cannot rate." });
    }

    // Check if rating is within valid range (1 to 5)
    if (!Array.isArray(rate) || rate.length === 0) {
      return res.status(400).json({
        error: "Rate must be an array containing at least one rating object.",
      });
    }

    // Validate each rating object in the rate array
    for (const rating of rate) {
      if (rating.value < 1 || rating.value > 5) {
        return res.status(400).json({
          error:
            "Each rating object must have a valid numeric value between 1 and 5.",
        });
      }
    }

    // Update the course document to add the ratings
    const updatedCourse = await CourseModel.findByIdAndUpdate(
      courseId,
      { $push: { rate: { $each: rate.map(value => ({ userId: req.user.id, value })) } } },
      { new: true }
    ).populate('rate.userId', 'username profilePic');

    // Calculate total average rate
    const totalRatings = updatedCourse.rate.length;
    const sumOfRatings = updatedCourse.rate.reduce(
      (acc, rating) => acc + rating.value,
      0
    );
    const totalAverageRate = totalRatings ? sumOfRatings / totalRatings : 0;

    // Update the total average rate attribute
    updatedCourse.totalAverageRate = totalAverageRate;
    await updatedCourse.save();

    res
      .status(200)
      .json({ message: "Rating submitted successfully.", updatedCourse });
  } catch (error) {
    console.error("Error while updating course:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};


export const courses = async (req, res) => {
  try {
    let { page, size, category, requirements } = req.query;
    let { skip, limit } = paginate(req);

    // Create a filter object
    let filter = {};

    // Add category to the filter if it's provided
    if (category) {
      filter.category = category;
    }

    
    // Find all courses matching the filter and populate the 'artistId' field with 'username', 'profilePic', and 'userType'
    let allCourses = await CourseModel.find(filter)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'artistId',
        select: 'username profilePic userType',
      });

    res.status(200).json({ message: 'Done', allCourses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};





// export const enrollInCourse = async (req, res) => {
//   try {
//     const { userId, courseId } = req.body;

//     // Find the user by userId
//     const user = await UserModel.findById(userId);
//     if (!user) {
//       return res.status(404).json({ error: "User not found." });
//     }

//     // Find the course by courseId
//     const course = await CourseModel.findById(courseId);
//     if (!course) {
//       return res.status(404).json({ error: "Course not found." });
//     }

//     // Check if the user is already enrolled in the course
//     if (course.enrolledStudents.includes(userId)) {
//       return res.status(400).json({ error: "User is already enrolled in the course." });
        
//     }

//     // Add the user to the course's list of enrolled students
//     // course.enrolledStudents.push(userId);
//     // user.enrolledCourses.push(courseId);
//     // await course.save();
//     // await user.save();

//     res.status(200).json({ 
//       message: "User enrolled in the course successfully.", 
//       user: {
//         userId: user._id,
//         username: user.username,
//         profilePic: user.profilePic
//       },
//       course: {
//         courseId: course._id,
//         artistId: course.artistId._id,
//         artistUsername: user.username,
//         artistProfilePic: user.profilePic
//       }
//     });
    
//   } catch (error) {
//     console.error("Error while enrolling user in the course:", error);
//     res.status(500).json({ error: "Internal server error." });
//   }
// };

export const enrollInCourse = async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    // Find the user by userId
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Find the course by courseId and populate the artistId field with artist details
    const course = await CourseModel.findById(courseId)
      .populate({
        path: "artistId",
        select: "username profilePic" // Select only the username and profilePic fields of the artist
      });
      
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    // Check if the user is already enrolled in the course
    if (course.enrolledStudents.includes(userId)) {
      return res.status(400).json({ error: "User is already enrolled in the course." });
    }

    // Add the user to the course's list of enrolled students
    course.enrolledStudents.push(userId);
    await course.save();

    res.status(200).json({ 
      message: "User enrolled in the course successfully.", 
      user: {
        userId: user._id,
        username: user.username,
        profilePic: user.profilePic
      },
      course: course // Return the entire course object with populated artist details
    });
    
  } catch (error) {
    console.error("Error while enrolling user in the course:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};


