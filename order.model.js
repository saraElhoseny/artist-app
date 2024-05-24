// import mongoose from "mongoose";


// const orderSchema = new mongoose.Schema(
//   { 
//     contractId : { type: mongoose.Types.ObjectId, ref: "contract" },
//     clientId: { type: mongoose.Types.ObjectId, ref: "User" },
//     orderStatus: {
//     orderStatus: {
//       type: String,
//       required: true,
//       enum: ["Pending", "Accepted", "Rejected"],
//       default : "Pending"
//     },
    
//         Description : { type: String, 
//           required : true
//           },

//         artistLevel : { 
//           type: String,
//            enum: ["Beginner", "Intermediate","professional"] ,
//            required : true
//            },

//         duration : {type : String , 
//           required : true 
//           },
//         category : {
//           type: String,
//           enum: [
//             "Landscape",
//             "Calligraphy",
//             "3D",
//             "Anime/Manga",
//             "Graffiti",
//             "Digital",
//             "Sketching",
//             "Surreal",
//             "abstract",
//           ],
//           required : true
//         } ,
//         image : String ,
//         price : Number, 
//         proposals : {
//           type: [{
//               coverLetter : {
//                   type: String,
//               },
//               artistId: {
//                 type: mongoose.Types.ObjectId,
//                 ref: "User",
//               },
//               hired : { type: Boolean, Default : false},
//               }] 
//             } ,
//             proposalsCount: { type: Number, default: 0 }
//             } ,
//       {
//        timestamps: true,
//       } ,
//       );

//       orderSchema.pre("save", function (next) {
//         this.proposalsCount = this.proposals.length;
//         next();
//       });
      

// const OrderModel = mongoose.model("Order", orderSchema);
// export default OrderModel;
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Types.ObjectId, ref: "User" },
    clientOrders : [
      {
        contractId: { type: mongoose.Types.ObjectId, ref: "contract" },
        orderStatus: {
          type: String,
          required: true,
          enum: ["Pending", "Accepted", "Rejected"],
          default: "Pending",
        },
        description: { type: String, required: true },
        artistLevel: {
          type: String,
          enum: ["Beginner", "Intermediate", "professional"],
          required: true,
        },
        duration: { type: String, required: true },
        category: {
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
          required: true,
        },
        attachment : String ,
        price : {
        type : Number ,
        required : true
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      proposals: {
        type: [
          {
            coverLetter: {
              type: String,
            },
            artistId: {
              type: mongoose.Types.ObjectId,
              ref: "User",
            },
            hired: { type: Boolean, Default: false },
          },
        ],
      },
      proposalsCount: { type: Number, default: 0 },
    },
  ], },
  {
    timestamps: true,
  }
);

// orderSchema.pre("save", function (next) {
//   this.clientOrders.forEach(order => {
//     order.proposalsCount = order.proposals.length;
//   });
//   next();
// });

orderSchema.pre("save", function (next) {
  this.clientOrders.forEach((order) => {
    if (!order.createdAt) {
      order.createdAt = new Date();
    }
    order.updatedAt = new Date();
    order.proposalsCount = order.proposals.length;
  });
  next();
});

// orderSchema.statics.updatePendingOrders = async function () {
//   const twoWeeksAgo = new Date();
//   twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 1); 

//   const ordersToUpdate = await this.find({
//       "clientOrders.orderStatus": "Pending",
//       "clientOrders.createdAt": { $lte: twoWeeksAgo }
//   });

//   ordersToUpdate.forEach(order => {
//       order.clientOrders.forEach(orderItem => {
//           if (orderItem.orderStatus === "Pending") {
//               orderItem.orderStatus = "Rejected";
//           }
//       });
//       order.save();
//   });
// };

const OrderModel = mongoose.model("Order", orderSchema);
export default OrderModel;
