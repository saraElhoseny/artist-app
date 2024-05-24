import mongoose from "mongoose";
const communitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],

    description: { type: String },
    shareType: {
      type: String,
      enum: ["post", "event"],
      default: "post",
    },
    paid: {
      type: Boolean,
      default: false,
      required: function () {
        return this.shareType == "post";
      },
    },
    eventDate: {
      type: Date,
      required: function () {
        return this.shareType == "event";
      },
    },
    eventLocation: {
      type: String,
      required: function () {
        return this.shareType == "event";
      },
    },
    eventPlace: {
      type: String,
      required: function () {
        return this.shareType == "event";
      },
    },
    eventCity: {
      type: String,
      required: function () {
        return this.shareType == "event";
      },
    },
    eventTime: {
      type: Date,
      required: function () {
        return this.shareType == "event";
      },
      default: null,
    },

    author: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // price: {
    //   type: Number,
    //   required: function () {
    //     return this.shareType == "post" && this.paid == true;
    //   },
    // },
    postCollection: {
      type: [
        {
          price: {
            type: Number,
            required: function () {
              return this.shareType == "post" && this.paid == true;
            },
          },
          images: { type: String, required: true },
        },
      ],
      required: function () {
        return this.shareType == "post";
      },
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    likedDate: {
      type: Date,
      default: null,
    },
    unlikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    totalCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const CommunityModel = mongoose.model("Community", communitySchema);
export default CommunityModel;
