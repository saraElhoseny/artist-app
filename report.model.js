import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  contentType: {
    type: String,
    enum: ["Contract", "Community", "Course"],
    required: true,
  },
  ContractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "contract",
    required: [
      function () {
        return this.contentType === "Contract";
      },
      "please select the order you wanna report",
    ],
  },
  CommunityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
    required: [
      function () {
        return this.contentType === "Community";
      },
      "please select a post to report",
    ],
  },
  CourseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: [
      function () {
        return this.contentType === "Course";
      },
      "please select a course to report",
    ],
  },
  reportDescription: {
    type: String,
    required: [true, "please feed us why you wanna report this content"],
  },
  ReportDate: {
    type: Date,
    default: null,
  },
  seeClaims: {
    _id: false,
    type: [
      {
        evimages: {
          type: [String],
        },
        evText: {
          type: String,
        },
      },
    ],
  },
});

const reportModel = mongoose.model("report", reportSchema);
export default reportModel;
