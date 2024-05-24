//import ChatModel from "../models/chat.model.js";
import CollectionModel from "../models/collection.model.js";
import contractModel from "../models/contract.model.js";
import OrderModel from "../models/order.model.js";
import ProjectModel from "../models/project.model.js";
import reviewsModel from "../models/reviews.model.js";
import UserModel from "../models/user.model.js";
import mongoose from "mongoose";
import { paginatePortraits } from "../services/pagination.js";
import cron from "node-cron";

export const createOrder = async (req, res) => {
  try {
    let { description, artistLevel, duration, category, price, attachment } = req.body;

    const validCategories = [
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

    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const validArtistLevels = ["Beginner", "Intermediate", "professional"];

    if (!validArtistLevels.includes(artistLevel)) {
      return res.status(400).json({ message: "Invalid artist level" });
    }

    const clientId = req.user._id;

    let client = await OrderModel.findOne({ clientId }).populate({
      path: 'clientId',
      select: '_id username profilePic address',
    });

    if (!client) {
      const user = await UserModel.findById(clientId); 
      const createdOrder = await OrderModel.create({
        clientId: req.user._id,
        clientOrders: [{
          description,
          artistLevel,
          duration,
          category,
          price,
          attachment,
        }],
      });

      const savedOrder = await createdOrder.save();

      // const formattedOrder = {
      //   clientId: user._id,
      //   clientUsername: user.username,
      //   profilePic: user.profilePic,
      //   address: user.address,
      //   orderDetails: savedOrder.clientOrders[0],
      //   proposals: savedOrder.clientOrders[0].proposals,
      // };

      const formattedOrder = {
        clientId: user._id,
        clientUsername: user.username,
        profilePic: user.profilePic,
        address: user.address,
        createdAt : savedOrder.createdAt,
        updatedAt : savedOrder.updatedAt,
        orderDetails: {
          orderStatus: "Pending",
          description,
          artistLevel,
          duration,
          category,
          price,
          proposalsCount: 0,
          _id: savedOrder.clientOrders[savedOrder.clientOrders.length - 1]._id,
          createdAt: savedOrder.clientOrders[0].createdAt,
          updatedAt: savedOrder.clientOrders[0].updatedAt,
        },
        proposals: savedOrder.clientOrders[0].proposals,
      };


      return res.status(201).json({
        message: "Order Created successfully",
        savedOrder: formattedOrder,
      });
    } else {
      const newOrder = {
        description,
        artistLevel,
        duration,
        category,
        attachment,
        price,
      };

      client.clientOrders.push(newOrder);
      const savedOrder = await client.save();

      // const formattedOrder = {
      //   clientId: client.clientId._id,
      //   clientUsername: client.clientId.username,
      //   profilePic: client.clientId.profilePic,
      //   address: client.clientId.address,
      //   orderDetails: savedOrder.clientOrders[savedOrder.clientOrders.length - 1],
      //   proposals: savedOrder.clientOrders[savedOrder.clientOrders.length - 1].proposals,
      //   // createdAt: savedOrder.createdAt,
      //   // updatedAt: savedOrder.updatedAt,
      // };
      const formattedOrder = {
        clientId: client.clientId._id,
        clientUsername: client.clientId.username,
        profilePic: client.clientId.profilePic,
        address: client.clientId.address,
        createdAt : savedOrder.createdAt,
        updatedAt : savedOrder.updatedAt,
        orderDetails: {
          orderStatus: "Pending",
          description,
          artistLevel,
          duration,
          category,
          price,
          proposalsCount: 0,
          _id: savedOrder.clientOrders[savedOrder.clientOrders.length - 1]._id,
          createdAt: savedOrder.clientOrders[savedOrder.clientOrders.length - 1].createdAt,
          updatedAt: savedOrder.clientOrders[savedOrder.clientOrders.length - 1].updatedAt,
        },
        proposals: savedOrder.clientOrders[savedOrder.clientOrders.length - 1].proposals,
      };
      return res.status(201).json({
        message: "Order Created successfully",
        savedOrder: formattedOrder,
      });
    }
  } catch (error) {
    console.error("Error while creating order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};





// export const deleteOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params; 
//     const clientId = req.user._id;

//     const client = await OrderModel.findOne({ clientId }).populate({
//       path: 'clientId',
//       select: '_id username profilePic address',
//     });

//     if (!client) {
//       return res.status(404).json({ message: "Client order not found" });
//     }

//     const orderToDeleteIndex = client.clientOrders.findIndex(order => order._id.toString() === orderId);

//     if (orderToDeleteIndex === -1) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     const deletedOrder = client.clientOrders.splice(orderToDeleteIndex, 1)[0];

//     const savedClient = await client.save();

//     return res.status(200).json({ 
//       message: "Order deleted successfully",
//       clientInfo: {
//         clientId: client.clientId._id,
//         clientUsername: client.clientId.username,
//         profilePic: client.clientId.profilePic,
//         address: client.clientId.address,
//       },
//       deletedOrder,
//     });
//   } catch (error) {
//     console.error("Error while deleting order:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };


export const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params; 
    //const userId = req.user._id;

    const order = await OrderModel.findOne({ "clientOrders._id" : orderId })

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const clientOrder = order.clientOrders.find(order => order._id.toString() === orderId);

    if (!clientOrder) {
      return res.status(404).json({ message: "Client order not found" });
    }

    if (order.clientId.toString() !== req.user._id.toString()) {
      return res.json({
        message: "Unauthorized to delete this order",
      });
    }

    const clientUser = await UserModel.findById(order.clientId);

    const isAnyArtistHired = clientOrder.proposals.some(proposal => proposal.hired === true);
    if (isAnyArtistHired) {
      return res.status(403).json({ message: "Cannot delete order because an artist has been hired" });
    }

    const deletedOrderIndex = order.clientOrders.findIndex(order => order._id.toString() === orderId);
    if (deletedOrderIndex === -1) {
      return res.status(404).json({ message: "Client order not found" });
    }

    const deletedOrder = order.clientOrders.splice(deletedOrderIndex, 1)[0];
    await order.save();

    const populatedProposals = await Promise.all(deletedOrder.proposals.map(async (proposal) => {
      const artist = await UserModel.findById(proposal.artistId);
      return {
        coverLetter: proposal.coverLetter,
        artistId: proposal.artistId,
        artistUsername: artist.username,
        artistProfilePic: artist.profilePic,
        hired: proposal.hired,
      };
    }));

    const deletedOrderWithProposals = {
      ...deletedOrder.toObject(),
      proposals: populatedProposals,
    };

    const clientInfo = {
      clientId: clientUser._id,
      clientUsername: clientUser.username,
      profilePic: clientUser.profilePic,
      address: clientUser.address,
    };

    return res.status(200).json({ 
      message: "Order deleted successfully",
      clientInfo,
      deletedOrder: deletedOrderWithProposals,
    });
  } catch (error) {
    console.error("Error while deleting order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const applyForProject = async (req, res) => {
  const { orderId } = req.params;
  const { coverLetter } = req.body;

  try {
    const order = await OrderModel.findOne({ "clientOrders._id": orderId });

    if (!order) {
      return res.status(400).json({ message: "Order not found" });
    }

    const clientOrder = order.clientOrders.find(
      (order) => order._id.toString() === orderId
    );

    if (!clientOrder) {
      return res.status(400).json({ message: "Client order not found" });
    }

    const artistProposal = clientOrder.proposals.find(
      (proposal) => proposal.artistId.toString() === req.user._id.toString()
    );

    const hiredArtist = clientOrder.proposals.find(
      (proposal) => proposal.hired
    );

    if (hiredArtist) {
      const hiredArtistUser = await UserModel.findById(hiredArtist.artistId);
      return res.status(400).json({
        message: `This project has already been hired to ${hiredArtistUser.username}. You cannot submit a cover letter.`,
      });
    }

    if (artistProposal && artistProposal.coverLetter) {
      return res
        .status(400)
        .json({ message: "You have already submitted a cover letter" });
    }

    const artist = await UserModel.findById(req.user._id);

    if (!artist) {
      return res.status(400).json({ message: "Artist not found" });
    }

    clientOrder.proposals.push({
      artistId: req.user._id,
      coverLetter,
      hired: false,
    });

    clientOrder.proposalsCount = clientOrder.proposals.length;

    const updatedOrder = await order.save();

    if (!updatedOrder) {
      return res
        .status(400)
        .json({ message: "Error while inserting to the Database" });
    }

    const newProposal = clientOrder.proposals.find(
      (proposal) => proposal.coverLetter === coverLetter
    );

    //res.status(201).json({ message: "Cover letter added successfully", updatedOrder });
    res
      .status(201)
      .json({ message: "Cover letter added successfully",
       proposals:{
        coverLetter : newProposal.coverLetter,
        artistId :  newProposal.artistId,
        hired : newProposal.hired,
        _id : newProposal._id,
        artistUsername: artist.username,
        artistProfilePic: artist.profilePic,
        createdAt : clientOrder.createdAt,
        updatedAt : clientOrder.updatedAt
      } 
       //artist: {
        //_id : artist._id ,
      //},
       //coverLetter 
      });
  } catch (error) {
    console.error("Error applying for project:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const acceptArtistProposal = async (req, res) => {
  const { orderId } = req.params;
  const { artistId } = req.body;

  try {
    const foundedOrder = await OrderModel.findOne({
      "clientOrders._id": orderId,
    });

    if (!foundedOrder) {
      return res.json({ message: "Order not found" });
    }

    const clientOrder = foundedOrder.clientOrders.find(
      (order) => order._id.toString() === orderId
    );

    if (foundedOrder.clientId.toString() !== req.user._id.toString()) {
      return res.json({
        message: "You are not allowed to approve the artist proposal",
      });
    }

    const isAlreadyHired = clientOrder.proposals.some(
      (proposal) => proposal.hired === true
    );

    if (isAlreadyHired) {
      return res.json({ message: "Already hired" });
    } else {
      const isArtistInProposals = clientOrder.proposals.some(
        (proposal) => proposal.artistId.toString() === artistId
      );

      if (!isArtistInProposals) {
        return res.json({
          message: "This artist is not found in the proposals",
        });
      }

      const order = await OrderModel.findOneAndUpdate(
        {
          "clientOrders._id": orderId,
          "clientOrders.proposals.artistId": artistId,
          "clientOrders.proposals.hired": false,
        },
        {
          $set: {
            "clientOrders.$[order].proposals.$[proposal].hired": true,
          },
        },
        {
          arrayFilters: [
            { "order.proposals.artistId": artistId },
            { "proposal.artistId": artistId, "proposal.hired": false },
          ],
          new: true,
        }
      );

      if (!order) {
        res.json({ message: "An error occurred while updating the order" });
      } else {
        const hiredProposal = order.clientOrders
          .find((order) => order._id.toString() === orderId)
          .proposals.find(
            (proposal) => proposal.artistId.toString() === artistId
          );
        // const { coverLetter, hired } = order.clientOrders
        //   .find((order) => order._id.toString() === orderId)
        //   .proposals.find(
        //     (proposal) => proposal.artistId.toString() === artistId
        //   );
        const artist = await UserModel.findById(artistId);

        res.status(200).json({
          message: "Artist proposal accepted",
          proposals:{
          coverLetter : hiredProposal.coverLetter,
          artistId : hiredProposal.artistId ,
          hired : hiredProposal.hired,
          _id : hiredProposal._id,
          artistUsername: artist.username,
          artistProfilePic: artist.profilePic,
          createdAt : clientOrder.createdAt,
          updatedAt : clientOrder.updatedAt
           } 
          // coverLetter,
          // artistId,
          // hired,
        });
        //res.status(200).json({ message: "Artist proposal accepted", order });
      }
    }
  } catch (error) {
    console.error("Error accepting artist proposal:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createContract = async (req, res) => {
  const { orderId } = req.params;
  const { requirements } = req.body;

  try {
    const foundedOrder = await OrderModel.findOne({
      "clientOrders._id": orderId,
    });

    if (!foundedOrder) {
      return res.json({ message: "Order not found" });
    }

    const clientOrder = foundedOrder.clientOrders.find(
      (order) => order._id.toString() === orderId
    );
    // let artistId = clientOrder.proposals.find(
    //   (proposal) => proposal.hired === true
    // ).artistId;
    if (foundedOrder.clientId.toString() !== req.user._id.toString()) {
      return res.json({
        message: "You are not allowed to create this Contract",
      });
    }

    const hiredArtist = clientOrder.proposals.find(
      (proposal) => proposal.hired === true
    );

    if (!hiredArtist) {
      return res.json({ message: "No artist is hired for this order yet" });
    }

    const artistId = hiredArtist.artistId;

    // const existingContract = await contractModel.findOne({
    //   "artistContracts.orderId": orderId,
    //   "artistContracts.contractType": { $nin: ["Rejected"] },
    // });

    const existingContract = await contractModel.findOne({
      artistContracts: {
        $elemMatch: {
          orderId: orderId,
          contractType: { $nin: ["Rejected"] }
        }
      }
    });

    if (existingContract) {
      return res.json({ message: "Contract already exists" });
    }

    // const existingChat = await ChatModel.findOne({
    //   $or: [
    //     { to: artistId, from: foundedOrder.clientId },
    //     { to: foundedOrder.clientId, from: artistId },
    //   ],
    // });

    // let chat;
    // if (existingChat) {
    //   chat = existingChat;
    // } else {
    //   chat = await ChatModel.create({
    //     to: artistId,
    //     from: foundedOrder.clientId,
    //   });
    // }

    // const chat = await ChatModel.create({
    //   to: artistId,
    //   from: foundedOrder.clientId,
    // });

    let artistContract = await contractModel.findOne({ artistId });

    if (!artistContract) {
      artistContract = await contractModel.create({
        artistId: artistId,
        artistContracts: [],
      });
    }

    const clientDetails = await UserModel.findById(foundedOrder.clientId);

    const newContract = {
      orderId,
      //chatId: chat._id,
      clientId: foundedOrder.clientId,
      clientApproval: true,
      requirements,
      clientSign: clientDetails.username,
      //clientSign: req.user.username,
      description: clientOrder.description,
      price: clientOrder.price,
    };

    artistContract.artistContracts.push(newContract);

    const savedContract = await artistContract.save();

    const newContractId = artistContract.artistContracts[artistContract.artistContracts.length - 1]._id;
    newContract.contractId = newContractId ;

    if (!savedContract) {
      return res
        .status(400)
        .json({ message: "Error while inserting to the Database" });
    }
    //res.status(200).json({ message: "Contract created successfully", savedContract });
    res
      .status(200)
      .json({ message: "Contract created successfully", newContract });
  } catch (error) {
    console.error("Error creating contract:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const artistContractDecision = async (req, res) => {
  const { contractId } = req.params;
  let { artistApproval } = req.body;

  try {
    const foundedContract = await contractModel.findOne({
      "artistContracts._id": contractId,
    });

    if (!foundedContract) {
      return res.status(200).json({ message: "Invalid Contract" });
    }

    const contractIndex = foundedContract.artistContracts.findIndex(
      (contract) => contract._id.toString() === contractId.toString()
    );

    if (contractIndex === -1) {
      return res.status(200).json({ message: "Contract not found" });
    }

    const contract = foundedContract.artistContracts[contractIndex];

    console.log("contract:", contract);

    if (foundedContract.artistId.toString() !== req.user._id.toString()) {
      return res.json({ message: "You are not allowed to sign this contract" });
    }

    if (
      foundedContract.artistContracts[contractIndex].contractType ==
        "Rejected" ||
      foundedContract.artistContracts[contractIndex].contractType == "Accepted"
    ) {
      return res.json({
        message: "You have already Responded to this contract",
      });
    }

    if (artistApproval == false) {
      foundedContract.artistContracts[contractIndex].artistApproval = false;
      foundedContract.artistContracts[contractIndex].contractType = "Rejected";
      await foundedContract.save();

      const updatedOrderWithProposals = await OrderModel.findOneAndUpdate(
        {
          "clientOrders._id": contract.orderId,
          "clientOrders.proposals.artistId": foundedContract.artistId,
          "clientOrders.proposals": {
            $elemMatch: { artistId: foundedContract.artistId },
          },
        },
        {
          $set: {
            "clientOrders.$[outer].proposals.$[inner].hired": false,
          },
        },
        {
          arrayFilters: [
            { "outer._id": contract.orderId },
            { "inner.artistId": foundedContract.artistId },
          ],
          new: true,
        }
      );
      await updatedOrderWithProposals.save();

      return res
        .status(200)
        .json({ message: "Contract rejected", rejectedContract: foundedContract.artistContracts[contractIndex] });
    } else {
      foundedContract.artistContracts[contractIndex].artistApproval = true;
      foundedContract.artistContracts[contractIndex].artistSign =
        req.user.username;
      foundedContract.artistContracts[contractIndex].contractType = "Accepted";

      await foundedContract.save();

      const updatedOrder = await OrderModel.findOneAndUpdate(
        {
          "clientOrders._id": contract.orderId,
        },
        {
          $set: {
            "clientOrders.$.orderStatus": "Accepted",
          },
        },
        { new: true }
      );
      return res.json({
        message: "Contract accepted",
        updatedContract: foundedContract.artistContracts[contractIndex],
      });
      //return res.json({ message: "Contract accepted",  updatedContract: foundedContract });
    }
  } catch (error) {
    console.error("Error handling artist contract decision:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createProject = async (req, res) => {
  const { contractId } = req.params;
  try {
    const foundedContract = await contractModel.findOne({
      "artistContracts._id": contractId
    });

    if (!foundedContract) {
      return res.status(400).json({ message: "Invalid Contract" });
    }

    const contractIndex = foundedContract.artistContracts.findIndex(
      contract => contract._id.toString() === contractId.toString()
    );

    if (foundedContract.artistId.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "You are not hired to create this project" });
    }

    if (
      foundedContract.artistContracts[contractIndex].artistApproval &&
      foundedContract.artistContracts[contractIndex].clientApproval
    ) {

      if (
        foundedContract.artistContracts[contractIndex].paid === false
      ) {
        return res
          .status(400)
          .json({ message: "Contract not paid, cannot create project" });
      }

      const existingProject = await ProjectModel.findOne({ contractId });

      if (existingProject) {
        return res
          .status(400)
          .json({ message: "A project already exists for this contract" });
      }

      // const order = foundedContract.artistContracts[contractIndex];

      // const { image, title, year } = req.body;
      // const price = order.price;
      // const artistLevel = order.artistLevel;
      // const description = order.description;
      // const category = order.category;
      // const clientId = order.clientId;

      // const CustomizedProject = await ProjectModel.create({
      //   artistId: req.user._id,
      //   title,
      //   price,
      //   image,
      //   description,
      //   category,
      //   artistLevel,
      //   orderId: order.orderId,
      //   contractId: order._id,
      //   year,
      //   clientId
      // });

      const orderId = foundedContract.artistContracts[contractIndex].orderId;
      const order = await OrderModel.findOne({ "clientOrders._id": orderId });

      if (!order) {
        return res.status(400).json({ message: "Order not found" });
      }

      const clientOrder = order.clientOrders.find(order => order._id.toString() === orderId.toString());

      const { image, title, year } = req.body;
      const price = clientOrder.price;
      const description = clientOrder.description;
      const category = clientOrder.category;
      const clientId = order.clientId;

      const CustomizedProject = await ProjectModel.create({
        artistId: req.user._id,
        title,
        price,
        image,
        description,
        category,
        orderId: clientOrder._id,
        contractId: foundedContract.artistContracts[contractIndex]._id,
        year,
        clientId
      });


      return res
        .status(201)
        .json({ message: "Project Created successfully", CustomizedProject });
    } else {
      return res
        .status(400)
        .json({
          message:
            "Both artist and client must approve the contract before creating a project"
        });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const reviewArtist = async (req, res) => {
  const { artistId } = req.params;
  const { comment } = req.body;
  const clientId = req.user._id;
  const project = await ProjectModel.findOne({
    artistId,
    clientId,
  });

  if (!project) {
    return res.status(400).json({
      message: "You are not allowed to create a review for this artist.",
    });
  } else {
    const existingReview = await reviewsModel.find({
      artistId,
      "Reviews.clientId": clientId,
    });

    if (existingReview.length > 0) {
      return res.status(400).json({
        message: "You have already submitted a review for this artist.",
      });
    } else {
      const review = {
        clientId,
        comment,
        createdAt: new Date(),
      };

      const updatedReview = await reviewsModel.findOneAndUpdate(
        { artistId },
        { $push: { Reviews: review } },
        { new: true, upsert: true }
      );
      const justCreatedReview = updatedReview.Reviews.find(
        (rev) => rev.clientId.toString() === clientId.toString()
      );

      const populatedReview = await reviewsModel.populate(justCreatedReview, {
        path: "clientId",
        select: "username profilePic -_id",
      });
  
      return res.status(201).json({
        message: "Review added successfully",
        Reviews: {
          username: populatedReview.clientId.username,
          profilePic: populatedReview.clientId.profilePic,
          comment: populatedReview.comment,
          createdAt : populatedReview.createdAt,
          //updatedAt : populatedReview.updatedAt
        },
      });

      // return res.status(201).json({
      //   message: "Review added successfully",
      //   review: justCreatedReview,
      // });
      //return res.status(201).json({ message: "Review added successfully", review: updatedReview });
    }
  }
};

export const viewArtistReviews = async (req, res) => {
  const { artistId } = req.params;

  try {
    const totalReviews = await reviewsModel.findOne({ artistId });

    if (!totalReviews || totalReviews.Reviews.length === 0) {
      return res.status(200).json({
        Reviews: [],
        totalComments: 0,
        message: "No reviews found for this artist."
      });
    }

    const commentsArray = totalReviews.Reviews;
    const totalComments = commentsArray.length;
    const { limit, skip } = paginatePortraits(req, totalComments);
    const endIndex = Math.min(skip + limit, totalComments);
    const commentsToShow = commentsArray.slice(skip, endIndex);
    const populatedComments = await reviewsModel.populate(commentsToShow, {
      path: "clientId",
      select: "username profilePic -_id",
    });

    const Reviews = populatedComments.map((comment) => ({
      username: comment.clientId.username,
      profilePic: comment.clientId.profilePic,
      comment: comment.comment,
      createdAt : comment.createdAt,
      //updatedAt : comment.updatedAt
    }));

    return res.status(200).json({
      Reviews,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(totalComments / limit),
      totalComments: totalComments,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const formatDate = (date) => {
  const now = new Date();
  const diff = Math.abs(now - date);
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  } else {
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    }
  }
};

export const rateProject = async (req, res) => {
  try {
    const { projectId, rating } = req.body;

    const project = await ProjectModel.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.clientId.toString() !== req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "You are not allowed to rate this project" });
    }

    if (project.rate) {
      return res.json({ message: "You have already rated this project" });
    }

    const updatedProject = await ProjectModel.findByIdAndUpdate(
      { _id: projectId },
      { rate: rating },
      { new: true }
    );

    const collection = await CollectionModel.findOne({
      artistId: project.artistId,
      "artistCollections.projects.projectId": projectId,
    });

    if (collection) {
      const collectionIndex = collection.artistCollections.findIndex(
        (collection) => collection.year === project.year
      );

      if (collectionIndex !== -1) {
        const projectIndex = collection.artistCollections[
          collectionIndex
        ].projects.findIndex(
          (p) => p.projectId.toString() === projectId.toString()
        );

        if (projectIndex !== -1) {
          collection.artistCollections[collectionIndex].projects[
            projectIndex
          ].rate = rating;
          const totalRate = collection.artistCollections[
            collectionIndex
          ].projects.reduce((sum, p) => sum + p.rate, 0);
          const totalProjects =
            collection.artistCollections[collectionIndex].projects.length;
          let averageRate = totalRate / totalProjects;
          averageRate = Math.round(averageRate);
          collection.artistCollections[collectionIndex].averageRate =
            averageRate;
          // collection.artistCollections[collectionIndex].averageRate =
          // Math.ceil(totalRate / totalProjects);
          await collection.save();
        }
      }
    }

    const allCollections = await CollectionModel.find({
      artistId: project.artistId,
    });
    const totalRate = allCollections.reduce(
      (acc, cur) =>
        acc + cur.artistCollections.reduce((a, c) => a + c.averageRate, 0),
      0
    );
    const totalCollections = allCollections.reduce(
      (acc, cur) => acc + cur.artistCollections.length,
      0
    );
    //const averageRateForArtist = Math.ceil(totalRate / totalCollections)
    let averageRateForArtist = totalRate / totalCollections;
    averageRateForArtist = Math.round(averageRateForArtist);

    await UserModel.findOneAndUpdate(
      { _id: project.artistId },
      { $set: { "ArtistInfo.0.rate": averageRateForArtist } }
    );

    //res.status(200).json({ message: "Rating added successfully", project: updatedProject });
    res.status(200).json({
      message: "Rating added successfully",
      projectId: updatedProject._id,
      rate: updatedProject.rate,
    });
  } catch (error) {
    console.error("Error in rateProject:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const viewProjectDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await OrderModel.findOne({
      "clientOrders._id": orderId,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const client = await UserModel.findById(order.clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    const clientOrder = order.clientOrders.find(
      (order) => order._id == orderId
    );
    // const response = {
    //   clientId: client._id,
    //   clientUsername: client.username,
    //   clientProfilePic: client.profilePic,
    //   address: client.address,
    //   createdAt : client.createdAt ,
    //   updatedAt : client.updatedAt,
    //   order: {
    //     description: clientOrder.description,
    //     category: clientOrder.category,
    //     duration: clientOrder.duration,
    //     price: clientOrder.price,
    //     proposalsCount: clientOrder.proposalsCount,
    //     attachment: clientOrder.attachment,
    //     proposals: clientOrder.proposals,
    //     _id : clientOrder._id,
    //   },
        
    // };
    const proposals = [];
    for (const proposal of clientOrder.proposals) {
      const artist = await UserModel.findById(proposal.artistId);
      proposals.push({
        coverLetter: proposal.coverLetter,
        artistId: proposal.artistId,
        hired: proposal.hired,
        _id: proposal._id,
        artistUsername: artist.username,
        artistProfilePic: artist.profilePic,
        createdAt: clientOrder.createdAt,
        updatedAt: clientOrder.updatedAt,
      });
    }

    const response = {
      clientId: client._id,
      clientUsername: client.username,
      clientProfilePic: client.profilePic,
      address: client.address,
      createdAt: order.createdAt,
      updatedAt : order.updatedAt,
      orderDetails: {
        description: clientOrder.description,
        category: clientOrder.category,
        duration: clientOrder.duration,
        price: clientOrder.price,
        proposalsCount: clientOrder.proposalsCount,
        attachment: clientOrder.attachment,
        // createdAt: clientOrder.createdAt,
        // updatedAt: clientOrder.updatedAt,
        _id: clientOrder._id,
      },
      proposals: proposals,
    };

    res.json(response);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// export const viewSpecificContract = async (req, res) => {
//   try {
//     const contractId = req.params.contractId;
//     const artistId = req.user._id;

//     const contract = await contractModel.findOne({
//       artistId: artistId,
//       "artistContracts._id": contractId,
//     });

//     if (!contract) {
//       return res.status(404).json({ message: "unauthorized user" });
//     }

//     const artistContract = contract.artistContracts.find(
//       (contract) => contract._id.toString() === contractId
//     );

//     if (!artistContract) {
//       return res.status(404).json({ message: "Artist contract not found" });
//     }

//     const {
//       artistSign,
//       clientSign,
//       description,
//       requirements,
//       clientId,
//       clientApproval,
//       artistApproval,
//       paid,
//       price,
//       createdAt,
//       updatedAt,
//       _id
//     } = artistContract;
//     const client = await UserModel.findById(clientId);
//     if (!client) {
//       return res.status(404).json({ message: "Client not found" });
//     }
//     res.json({
//       message: `New painting for ${client.username}`,
//       artistSign,
//       clientSign,
//       price,
//       description,
//       requirements,
//       clientApproval,
//       artistApproval,
//       paid,
//       price,
//       createdAt ,
//       updatedAt,
//       _id,
//       clientUsername: client.username,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

export const viewSpecificContract = async (req, res) => {
  try {
    const contractId = req.params.contractId;
    const userId = req.user._id;
    const userType = req.user.userType;

    const contract = await contractModel.findOne({"artistContracts._id" : contractId}).populate({
      path: 'artistContracts.clientId artistId',
      select: 'username profilePic'
    });

    if (!contract) {
      return res.status(200).json({ message: "Contract not found" });
    }

    const artistContract = contract.artistContracts.find(
      (contract) => contract._id.toString() === contractId
    );

    if (!artistContract) {
      return res.status(200).json({ message: "Artist contract not found" });
    }

    const client = artistContract.clientId;
    const artist = contract.artistId;

    if (userType === "Client" && client._id.toString() !== userId.toString()) {
      return res.status(401).json({ message: "Unauthorized client" });
    }

    if (userType === "Artist" && artist._id.toString() !== userId.toString()) {
      return res.status(401).json({ message: "Unauthorized artist" });
    }

    const {
      orderId,
      artistSign,
      clientSign,
      description,
      requirements,
      contractType,
      clientApproval,
      artistApproval,
      paid,
      price,
      createdAt,
      updatedAt,
      _id
    } = artistContract;

    res.json({
      message: `New painting for ${client.username}`,
      Contracts: [
        {
          _id,
          orderId,
          price,
          description,
          requirements,
          contractType,
          clientSign,
          artistSign,
          artistApproval,
          clientApproval,
          paid,
          createdAt,
          updatedAt,
          clientUsername: client.username,
          clientProfilePic: client.profilePic,
          artistUsername: artist.username,
          artistProfilePic: artist.profilePic
        }
      ]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const viewAllArtistContracts = async (req, res) => {
  try {
    const artistId = req.params.artistId;
    const user = req.user;

    if (user._id.toString() !== artistId.toString()) {
      return res.status(403).json({ message: "Unauthorized user" });
    }

    const contractType = req.query.contractType;
    const { page, size } = req.query;

    const pipeline = [
      { $match: { artistId: new mongoose.Types.ObjectId(artistId) } },
      {
        $lookup: {
          from: "users",
          localField: "artistId",
          foreignField: "_id",
          as: "artistInfo",
        },
      },
      { $unwind: "$artistContracts" },
      {
        $match: contractType
          ? {
              "artistContracts.contractType": {
                $regex: new RegExp(contractType, "i"),
              },
            }
          : {},
      },
      {
        $project: {
          _id: 0,
          contractType: "$artistContracts.contractType",
          artistUsername: { $arrayElemAt: ["$artistInfo.username", 0] },
          artistProfilePic: { $arrayElemAt: ["$artistInfo.profilePic", 0] },
          clientId: "$artistContracts.clientId",
          price: "$artistContracts.price",
          orderId : "$artistContracts.orderId",
          description: "$artistContracts.description",
          requirements : "$artistContracts.requirements",
          clientSign :  "$artistContracts.clientSign",
          artistSign :  "$artistContracts.artistSign",
          artistApproval :  "$artistContracts.artistApproval",
          clientApproval :  "$artistContracts.clientApproval",
          paid : "$artistContracts.paid",
          price : "$artistContracts.price",
          createdAt : "$artistContracts.createdAt",
          updatedAt : "$artistContracts.updatedAt",
          _id :  "$artistContracts._id",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "clientId",
          foreignField: "_id",
          as: "clientInfo",
        },
      },
      {
        $project: {
          contractType: 1,
          clientUsername: { $arrayElemAt: ["$clientInfo.username", 0] },
          clientProfilePic: { $arrayElemAt: ["$clientInfo.profilePic", 0] },
          price: 1,
          description: 1,
          requirements : 1 ,
          orderId : 1,
          clientSign : 1 ,
          artistSign : 1 ,
          artistApproval : 1 ,
          clientApproval : 1 ,
          createdAt : 1,
          updatedAt : 1 ,
          artistUsername: 1,
          artistProfilePic: 1,
          paid : 1,
          price : 1,
          _id : 1,
        },
      },
    ];

    const contractsCountPipeline = [
      { $match: { artistId: new mongoose.Types.ObjectId(artistId) } },
      { $unwind: "$artistContracts" },
      {
        $match: contractType
          ? {
              "artistContracts.contractType": {
                $regex: new RegExp(contractType, "i"),
              },
            }
          : {},
      },
      { $count: "totalContracts" },
    ];

    let modifiedPipeline = [...pipeline];

    if (page && size) {
      const { limit, skip } = paginatePortraits(req, size);
      modifiedPipeline = modifiedPipeline.concat([
        { $skip: skip },
        { $limit: limit },
      ]);
    }

    const [contracts, countResult] = await Promise.all([
      contractModel.aggregate(modifiedPipeline),
      contractModel.aggregate(contractsCountPipeline),
    ]);

    const totalContracts =
      countResult.length > 0 ? countResult[0].totalContracts : 0;
    const totalPages = Math.ceil(totalContracts / size) || 1;

    if (contracts.length === 0) {
      if (totalContracts === 0) {
        return res
          .status(200)
          .json({ message: `Contract type is not found for this artist.`,
                  Contracts: contracts
           });
      } else {
        return res.status(400).json({
          message: `Requested page and size are not suitable for the number of contracts matching the contract type.`,
          Contracts: contracts,
          currentPage: page,
          totalPages,
          totalContracts,
        });
      }
    }

    if (req.query.page && req.query.size){
      return res.status(200).json({
        Contracts: contracts,
        currentPage: page,
        totalPages,
        totalContracts,
      });
    } else {
       return res.status(200).json({
        Contracts: contracts,
        totalContracts,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

export const viewClientContracts = async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const user = req.user;

    if (user._id.toString() !== clientId.toString()) {
      return res.status(403).json({ message: "Unauthorized user" });
    }

    const contractType = req.query.contractType;
    const { page, size } = req.query;

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "artistId",
          foreignField: "_id",
          as: "artistInfo",
        },
      },
      {
        $unwind: "$artistContracts"
      },
      {
        $match: {
          "artistContracts.clientId": new mongoose.Types.ObjectId(clientId)
        }
      },
      {
        $match: contractType
          ? {
              "artistContracts.contractType": {
                $regex: new RegExp(contractType, "i"),
              },
            }
          : {},
      },
      {
        $lookup: {
          from: "users",
          localField: "artistContracts.clientId",
          foreignField: "_id",
          as: "clientInfo",
        },
      },
      {
                $match: {
                  $expr: {
                    $eq: ["$artistContracts.clientSign", { $arrayElemAt: ["$clientInfo.username", 0] }]
                  }
                }
              },
      {
        $project: {
          _id: 0,
          contractType: "$artistContracts.contractType",
          artistUsername: { $arrayElemAt: ["$artistInfo.username", 0] },
          artistProfilePic: { $arrayElemAt: ["$artistInfo.profilePic", 0] },
          clientUsername: { $arrayElemAt: ["$clientInfo.username", 0] },
          clientProfilePic: { $arrayElemAt: ["$clientInfo.profilePic", 0] },
          price: "$artistContracts.price",
          orderId : "$artistContracts.orderId",
          description: "$artistContracts.description",
          requirements: "$artistContracts.requirements",
          clientSign: "$artistContracts.clientSign",
          artistSign: "$artistContracts.artistSign",
          artistApproval: "$artistContracts.artistApproval",
          clientApproval: "$artistContracts.clientApproval",
          paid: "$artistContracts.paid",
          createdAt: "$artistContracts.createdAt",
          updatedAt: "$artistContracts.updatedAt",
          _id: "$artistContracts._id",
        },
      },
    ];


    // const contractsCountPipeline = [
    //   { $match: { "artistContracts.clientId": new mongoose.Types.ObjectId(clientId) } },
    //   { $unwind: "$artistContracts" },
    //   {
    //     $match: contractType
    //       ? {
    //           "artistContracts.contractType": {
    //             $regex: new RegExp(contractType, "i"),
    //           },
    //         }
    //       : {},
    //   },
    //   { $count: "totalContracts" },
    // ];
    const contractsCountPipeline = [
      { $match: { "artistContracts.clientId": new mongoose.Types.ObjectId(clientId) } },
      {
        $unwind: "$artistContracts"
      },
      {
        $lookup: {
          from: "users",
          localField: "artistContracts.clientId",
          foreignField: "_id",
          as: "clientInfo",
        },
      },
      { $match: { "artistContracts.clientId": new mongoose.Types.ObjectId(clientId) } },
      {
        $match: {
          $expr: {
            $eq: ["$artistContracts.clientSign", { $arrayElemAt: ["$clientInfo.username", 0] }]
          }
        }
      },
      {
        $match: contractType
          ? {
              "artistContracts.contractType": {
                $regex: new RegExp(contractType, "i"),
              },
            }
          : {},
      },
      { $count: "totalContracts" },
    ];
    let modifiedPipeline = [...pipeline];

    if (page && size) {
      const { limit, skip } = paginatePortraits(req, size);
      modifiedPipeline = modifiedPipeline.concat([
        { $skip: skip },
        { $limit: limit },
      ]);
    }

    const [contracts, countResult] = await Promise.all([
      contractModel.aggregate(modifiedPipeline),
      contractModel.aggregate(contractsCountPipeline),
    ]);

    const totalContracts =
      countResult.length > 0 ? countResult[0].totalContracts : 0;
    const totalPages = Math.ceil(totalContracts / size) || 1;

    if (contracts.length === 0) {
      if (totalContracts === 0) {
        return res
          .status(200)
          .json({ message: `No contracts found for this client.`, Contracts: contracts });
      } else {
        return res.status(400).json({
          message: `Requested page and size are not suitable for the number of contracts matching the contract type.`,
          Contracts: contracts,
          currentPage: page,
          totalPages,
          totalContracts,
        });
      }
    }

    if (req.query.page && req.query.size){
      return res.status(200).json({
        Contracts: contracts,
        currentPage: page,
        totalPages,
        totalContracts,
      });
    } else {
       return res.status(200).json({
        Contracts: contracts,
        totalContracts,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// export const viewClientContracts = async (req, res) => {
//   try {
//     const clientId = req.params.clientId;
//     const user = req.user;

//     if (user._id.toString() !== clientId.toString()) {
//       return res.status(403).json({ message: "Unauthorized user" });
//     }

//     const contractType = req.query.contractType;
//     const { page, size } = req.query;

//     const pipeline = [
//       {
//         $match: { "artistContracts.clientId": new mongoose.Types.ObjectId(clientId)}
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "artistId",
//           foreignField: "_id",
//           as: "artistInfo",
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "artistContracts.clientId",
//           foreignField: "_id",
//           as: "clientInfo",
//         },
//       },
//       { $unwind: "$artistContracts" },
//       {
//         $match: { "artistContracts.clientId": new mongoose.Types.ObjectId(clientId)}
//       },
//       {
//         $match: {
//           $expr: {
//             $eq: ["$artistContracts.clientSign", { $arrayElemAt: ["$clientInfo.username", 0] }]
//           }
//         }
//       },
//       {
//         $match: contractType
//           ? {
//               "artistContracts.contractType": {
//                 $regex: new RegExp(contractType, "i"),
//               },
//             }
//           : {},
//       },
      
//       {
//         $project: {
//           _id: 0,
//           contractType: "$artistContracts.contractType",
//           artistUsername: { $arrayElemAt: ["$artistInfo.username", 0] },
//           artistProfilePic: { $arrayElemAt: ["$artistInfo.profilePic", 0] },
//           artistId: "$_id",
//           price: "$artistContracts.price",
//           description: "$artistContracts.description",
//           requirements : "$artistContracts.requirements",
//           clientSign :  "$artistContracts.clientSign",
//           artistSign :  "$artistContracts.artistSign",
//           artistApproval :  "$artistContracts.artistApproval",
//           clientApproval :  "$artistContracts.clientApproval",
//           paid : "$artistContracts.paid",
//           price : "$artistContracts.price",
//           createdAt : "$artistContracts.createdAt",
//           updatedAt : "$artistContracts.updatedAt",
//           _id :  "$artistContracts._id",
//         },
//       },
//       {
//         $project: {
//           contractType: 1,
//           price: 1,
//           description: 1,
//           requirements : 1,
//           clientSign :  1,
//           artistSign : 1,
//           artistApproval :  1,
//           clientApproval :  1,
//           artistUsername: 1,
//           artistProfilePic: 1,
//           paid : 1,
//           price : 1,
//           createdAt : 1,
//           updatedAt : 1,
//           _id :  1,
//         },
//       },
//     ];

//     const contractsCountPipeline = [
//       { $match: { "artistContracts.clientId": new mongoose.Types.ObjectId(clientId) } },
//       {
//         $lookup: {
//           from: "users",
//           localField: "artistContracts.clientId",
//           foreignField: "_id",
//           as: "clientInfo",
//         },
//       },
      
//       { $unwind: "$artistContracts" },
//       { $match: { "artistContracts.clientId": new mongoose.Types.ObjectId(clientId) } },
//       {
//         $match: {
//           $expr: {
//             $eq: ["$artistContracts.clientSign", { $arrayElemAt: ["$clientInfo.username", 0] }]
//           }
//         }
//       },
      
//       {
//         $match: contractType
//           ? {
//               "artistContracts.contractType": {
//                 $regex: new RegExp(contractType, "i"),
//               },
//             }
//           : {},
//       },
//       { $count: "totalContracts" },
//     ];

//     let modifiedPipeline = [...pipeline];

//     if (page && size) {
//       const { limit, skip } = paginatePortraits(req, size);
//       modifiedPipeline = modifiedPipeline.concat([
//         { $skip: skip },
//         { $limit: limit },
//       ]);
//     }

//     const [contracts, countResult] = await Promise.all([
//       contractModel.aggregate(modifiedPipeline),
//       contractModel.aggregate(contractsCountPipeline),
//     ]);

//     const totalContracts =
//       countResult.length > 0 ? countResult[0].totalContracts : 0;
//     const totalPages = Math.ceil(totalContracts / size) || 1;

//     if (contracts.length === 0) {
//       if (totalContracts === 0) {
//         return res
//           .status(404)
//           .json({ message: `No contracts found for this client.` ,
//                   Contracts: contracts
//            });
//       } else {
//         return res.status(400).json({
//           message: `Requested page and size are not suitable for the number of contracts.`,
//           Contracts: contracts,
//           currentPage: page,
//           totalPages,
//           totalContracts,
//         });
//       }
//     }

//     if (req.query.page && req.query.size){
//       return res.status(200).json({
//         Contracts: contracts,
//         currentPage: page,
//         totalPages,
//         totalContracts,
//       });
//     } else {
//        return res.status(200).json({
//         Contracts: contracts,
//         totalContracts,
//       });
//     }
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Server Error" });
//   }
// };






export const viewAllOrders = async (req, res) => {
  try {
    const orderStatusFilter = req.query.orderStatus;
    const categoryFilter = req.query.category;
    const { page, size } = req.query;

    const matchStage = {};

    if (orderStatusFilter) {
      matchStage["clientOrders.orderStatus"] = orderStatusFilter;
    }
    if (categoryFilter) {
      matchStage["clientOrders.category"] = categoryFilter;
    }

    const pipeline = [
      { $match: matchStage },
      { $unwind: "$clientOrders" },
      {
        $match: {
          $and: [
            {
              "clientOrders.orderStatus": orderStatusFilter || {
                $exists: true,
              },
            },
            { "clientOrders.category": categoryFilter || { $exists: true } },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "clientId",
          foreignField: "_id",
          as: "user",
          //as: "client"
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "clientOrders.proposals.artistId",
          foreignField: "_id",
          as: "artist",
        },
      },
      {
        $project: {
          _id: 0,
          clientId: { $arrayElemAt: ["$user._id", 0] },
          clientUsername: { $arrayElemAt: ["$user.username", 0] },
          profilePic: { $arrayElemAt: ["$user.profilePic", 0] },
          address: { $arrayElemAt: ["$user.address", 0] },
          orderDetails: "$clientOrders" ,
          orderDetails: {
            category: "$clientOrders.category",
            description: "$clientOrders.description",
            artistLevel: "$clientOrders.artistLevel",
            duration : "$clientOrders.duration",
            attachment : "$clientOrders.attachment",
            price: "$clientOrders.price",
            orderStatus: "$clientOrders.orderStatus",
            proposalsCount: "$clientOrders.proposalsCount",
            //proposals: "$clientOrders.proposals",
            _id :  "$clientOrders._id",
          },
         
          // proposal: {
          //   coverLetter: "$clientOrders.proposals.coverLetter",
          //   artistId : "$clientOrders.proposals.artistId" ,
          //   hired: "$clientOrders.proposals.hired",
          //   _id : "$clientOrders.proposals._id",
          //   artistUsername: { $arrayElemAt: ["$artist.username", 0] },
          //   artistProfilePic: { $arrayElemAt: ["$artist.profilePic", 0] },
          // },
          proposals: {
            $map: {
              input: "$clientOrders.proposals",
              as: "proposal",
              in: {
                _id: "$$proposal._id",
                coverLetter: "$$proposal.coverLetter",
                artistId: "$$proposal.artistId",
                hired: "$$proposal.hired",
                createdAt : "$clientOrders.createdAt" ,
                updatedAt : "$clientOrders.updatedAt" ,
                artistUsername: {
                  $let: {
                    vars: {
                      artistId: "$$proposal.artistId",
                      artist: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$artist",
                              as: "artist",
                              cond: { $eq: ["$$artist._id", "$$proposal.artistId"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: "$$artist.username",
                  },
                },
                artistProfilePic: {
                  $let: {
                    vars: {
                      artistId: "$$proposal.artistId",
                      artist: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$artist",
                              as: "artist",
                              cond: { $eq: ["$$artist._id", "$$proposal.artistId"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: "$$artist.profilePic",
                  },
                },
              },
            },
          },
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",
          // category: "$clientOrders.category",
          // description: "$clientOrders.description",
          // artistLevel: "$clientOrders.artistLevel",
          // price: "$clientOrders.price",
          // orderStatus: "$clientOrders.orderStatus",
        },
      },
    ];

    const countPipeline = [
      { $match: matchStage },
      { $unwind: "$clientOrders" },
      {
        $match: {
          $and: [
            {
              "clientOrders.orderStatus": orderStatusFilter || {
                $exists: true,
              },
            },
            { "clientOrders.category": categoryFilter || { $exists: true } },
          ],
        },
      },
      { $count: "totalOrders" },
    ];

    if (page && size) {
      const totalOrders = await OrderModel.countDocuments(matchStage);
      const { limit, skip } = paginatePortraits(req, totalOrders);
      pipeline.push({ $skip: skip }, { $limit: limit });
    }

    const [formattedOrders, countResult] = await Promise.all([
      OrderModel.aggregate(pipeline),
      OrderModel.aggregate(countPipeline),
    ]);

    const totalOrders = countResult.length > 0 ? countResult[0].totalOrders : 0;
    const totalPages = Math.ceil(totalOrders / size) || 1;

    if (countResult.length === 0) {
      let errorMessage = "";

      const orderStatusMatch = await OrderModel.aggregate([
        { $unwind: "$clientOrders" },
        { $group: { _id: "$clientOrders.orderStatus" } },
      ]);

      const categoryMatch = await OrderModel.aggregate([
        { $unwind: "$clientOrders" },
        { $group: { _id: "$clientOrders.category" } },
      ]);

      const orderStatusFound = orderStatusMatch.some(
        (status) => status._id === orderStatusFilter
      );
      const categoryFound = categoryMatch.some(
        (category) => category._id === categoryFilter
      );
      const categoryFoundNotOrderStatus = categoryMatch.some(
        (category) => category._id === categoryFilter ,
        (status) => status._id !== orderStatusFilter
      );

      const orderStatusFoundNotCategory = orderStatusMatch.some(
        (status) => status._id === orderStatusFilter ,
        (category) => category._id !== categoryFilter
      );


      if (
        orderStatusFilter &&
        !orderStatusFound &&
        categoryFilter &&
        !categoryFound
      ) {
        errorMessage = "Orders not found for specified criteria";
      } else if (orderStatusFilter && !orderStatusFound || orderStatusFilter && !orderStatusFound && categoryFilter && categoryFound ) {
        errorMessage += "Orders not found for the specified orderStatus ";
      } else if (categoryFilter && !categoryFound || categoryFilter && !categoryFound && orderStatusFilter && orderStatusFound) {
        errorMessage += "Orders not found for specified category";
      } else if (categoryFoundNotOrderStatus || orderStatusFoundNotCategory) {
        errorMessage += "Matching between orderStatus and category is not found";
      } 

      return res.status(200).json({ Projects: formattedOrders , message: errorMessage, totalOrders });
    }

    if (totalPages < page) {
      return res.status(400).json({
        message: `Requested page and size are not suitable for the number of Orders found.`,
        Projects: formattedOrders,
        currentPage: page,
        //currentPage : Math.floor(skip / limit) + 1 ,
        totalPages,
        totalOrders,
      });
    }
    if (req.query.page && req.query.size){
      return res.status(200).json({
        Projects: formattedOrders,
        currentPage: page,
        //currentPage : Math.floor(skip / limit) + 1 ,
        totalPages,
        totalOrders,
      });
    } else {
       return res.status(200).json({
        Projects: formattedOrders,
         totalOrders,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};


export const viewAllArtists = async (req, res) => {
  try {
    //const { page, size } = req.query;
    const totalArtists = await UserModel.countDocuments({ userType: "Artist" });

    const { limit, skip } = paginatePortraits(req, totalArtists);

    const artists = await UserModel.find({ userType: "Artist" })
      .skip(skip)
      .limit(limit)
      .populate("enrolledCourses");

    const artistDetails = await Promise.all(
      artists.map(async (artist) => {
        const latestProject = await ProjectModel.findOne({
          artistId: artist._id,
        }).sort({ createdAt: -1 });

        const artistInfo = artist.ArtistInfo[0];
        return {
          username: artist.username,
          address: artist.address,
          category: artistInfo?.departments,
          rate: artistInfo?.rate,
          profilePic: artist.profilePic,
          lastProject: latestProject?.image || null,
          ordersCount: artistInfo?.ordersCount,
          hourlyRate: artistInfo?.hourlyRate,
        };
      })
    );

    //res.json(artistDetails);
    const totalPages = Math.ceil(totalArtists / limit);

    res.json({
      artists: artistDetails,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: totalPages,
      totalArtists: totalArtists,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const clientProfile = async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const client = await UserModel.findById(clientId);

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const orderStatusFilter = req.query.orderStatus;
    const categoryFilter = req.query.category;
    const { page, size } = req.query;

    const matchStage = {
      clientId: new mongoose.Types.ObjectId(clientId),
    };

    if (orderStatusFilter) {
      matchStage["clientOrders.orderStatus"] = orderStatusFilter;
    }
    if (categoryFilter) {
      matchStage["clientOrders.category"] = categoryFilter;
    }

    const pipeline = [
      { $match: matchStage },
      { $unwind: "$clientOrders" },
      {
        $match: {
          $and: [
            {
              "clientOrders.orderStatus": orderStatusFilter || {
                $exists: true,
              },
            },
            { "clientOrders.category": categoryFilter || { $exists: true } },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "clientId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "clientOrders.proposals.artistId",
          foreignField: "_id",
          as: "artist",
        },
      },
      {
        $project: {
          _id: 0,
          clientId: { $arrayElemAt: ["$user._id", 0] },
          clientUsername: { $arrayElemAt: ["$user.username", 0] },
          profilePic: { $arrayElemAt: ["$user.profilePic", 0] },
          address: { $arrayElemAt: ["$user.address", 0] },
          orderDetails: "$clientOrders" ,
          orderDetails: {
            category: "$clientOrders.category",
            description: "$clientOrders.description",
            artistLevel: "$clientOrders.artistLevel",
            duration : "$clientOrders.duration",
            attachment : "$clientOrders.attachment",
            price: "$clientOrders.price",
            orderStatus: "$clientOrders.orderStatus",
            proposalsCount: "$clientOrders.proposalsCount",
            //proposals: "$clientOrders.proposals",
            // createdAt : "$clientOrders.createdAt" ,
            // updatedAt : "$clientOrders.updatedAt" ,
            _id :  "$clientOrders._id",
          },
         
          // proposal: {
          //   coverLetter: "$clientOrders.proposals.coverLetter",
          //   artistId : "$clientOrders.proposals.artistId" ,
          //   hired: "$clientOrders.proposals.hired",
          //   _id : "$clientOrders.proposals._id",
          //   artistUsername: { $arrayElemAt: ["$artist.username", 0] },
          //   artistProfilePic: { $arrayElemAt: ["$artist.profilePic", 0] },
          // },
          proposals: {
            $map: {
              input: "$clientOrders.proposals",
              as: "proposal",
              in: {
                _id: "$$proposal._id",
                coverLetter: "$$proposal.coverLetter",
                artistId: "$$proposal.artistId",
                hired: "$$proposal.hired",
                createdAt : "$clientOrders.createdAt" ,
                updatedAt : "$clientOrders.updatedAt" ,
                artistUsername: {
                  $let: {
                    vars: {
                      artistId: "$$proposal.artistId",
                      artist: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$artist",
                              as: "artist",
                              cond: { $eq: ["$$artist._id", "$$proposal.artistId"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: "$$artist.username",
                  },
                },
                artistProfilePic: {
                  $let: {
                    vars: {
                      artistId: "$$proposal.artistId",
                      artist: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$artist",
                              as: "artist",
                              cond: { $eq: ["$$artist._id", "$$proposal.artistId"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: "$$artist.profilePic",
                  },
                },
              },
            },
          },
      // {
      //   $project: {
      //     //_id: 0,
      //     clientId: { $arrayElemAt: ["$user._id", 0] },
      //     clientUsername: { $arrayElemAt: ["$user.username", 0] },
      //     profilePic: { $arrayElemAt: ["$user.profilePic", 0] },
      //     address: { $arrayElemAt: ["$user.address", 0] },
      //     category: "$clientOrders.category",
      //     description: "$clientOrders.description",
      //     artistLevel: "$clientOrders.artistLevel",
      //     price: "$clientOrders.price",
      //     orderStatus: "$clientOrders.orderStatus",
      //     proposalsCount: "$clientOrders.proposalsCount",
      //     proposals: "$clientOrders.proposals",
      //     _id :  "$clientOrders._id",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt",
        },
      },
    ];

    const countPipeline = [
      { $match: matchStage },
      { $unwind: "$clientOrders" },
      {
        $match: {
          $and: [
            {
              "clientOrders.orderStatus": orderStatusFilter || {
                $exists: true,
              },
            },
            { "clientOrders.category": categoryFilter || { $exists: true } },
          ],
        },
      },
      { $count: "totalOrders" },
    ];

    if (page && size) {
      const { limit, skip } = paginatePortraits(req, size);
      pipeline.push({ $skip: skip }, { $limit: limit });
    }

    const [formattedOrders, countResult] = await Promise.all([
      OrderModel.aggregate(pipeline),
      OrderModel.aggregate(countPipeline),
    ]);

    const totalOrders = countResult.length > 0 ? countResult[0].totalOrders : 0;
    const totalPages = Math.ceil(totalOrders / size) || 1;

    if (countResult.length === 0) {
      let errorMessage = "";
       if (
        orderStatusFilter &&
        categoryFilter &&
        countResult.every(
          (order) =>
            order.clientOrders.orderStatus !== orderStatusFilter &&
            order.clientOrders.category !== categoryFilter
        )
      ) {
        errorMessage += 
        "Combination of order status and category is not found for this client.";
      } else if (
        categoryFilter &&
        countResult.every(
          (order) => order.clientOrders.category !== categoryFilter
        )
      ) {
        errorMessage += "Category is not found for this client.";
      } else if (
        orderStatusFilter &&
        countResult.every(
          (order) => order.clientOrders.orderStatus !== orderStatusFilter
        ) 
      ) {
        errorMessage += "Order type is not found for this client. ";
      } 
      return res.status(200).json({Projects: formattedOrders, message: errorMessage, totalOrders });
    }

   
    if (totalPages < page) {
      return res.status(400).json({
        message: `Requested page and size are not suitable for the number of Orders found.`,
        Projects: formattedOrders,
        currentPage: page,
        totalPages,
        totalOrders,
      });
    }
    if (req.query.page && req.query.size){
      return res.status(200).json({
        Projects: formattedOrders,
        currentPage: page,
        totalPages,
        totalOrders,
      });
    } else {
       return res.status(200).json({
        Projects: formattedOrders,
        totalOrders,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

export const viewProjectProposals = async (req, res) => {
  try {
    const { clientId, orderId } = req.params;
    const order = await OrderModel.findOne({
      "clientOrders._id": orderId,
      clientId,
    })
      .populate({
        path: "clientOrders.proposals.artistId",
        select: "username profilePic",
      })
      .populate({
        path: "clientId",
        select: "username profilePic",
      });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!order.clientOrders || !Array.isArray(order.clientOrders)) {
      return res.status(400).json({ message: "Invalid order structure" });
    }

    const specificClientOrder = order.clientOrders.find(
      (clientOrder) => clientOrder._id.toString() === orderId
    );

    if (!specificClientOrder) {
      return res.status(404).json({ message: "Client order not found" });
    }

    const totalProposals = specificClientOrder.proposals.length;

    const { limit, skip } = paginatePortraits(
      req,
      specificClientOrder.proposals.length
    );
    const proposals = [];
    if (
      specificClientOrder.proposals &&
      Array.isArray(specificClientOrder.proposals)
    ) {
      specificClientOrder.proposals.slice(skip, skip + limit).forEach((proposal) => {
        if (
          proposal.artistId &&
          proposal.artistId.username &&
          proposal.coverLetter
        ) {
          proposals.push({
            _id: proposal._id,
            coverLetter: proposal.coverLetter,
            artistId: proposal.artistId._id,
            hired: proposal.hired,
            artistUsername: proposal.artistId.username,
            artistProfilePic: proposal.artistId.profilePic,
          });
        }
      });
    }
    
    // res.status(200).json({
    //   clientUsername: order.clientId.username,
    //   clientProfilePic: order.clientId.profilePic,
    //   coverLetters
    // });
    
    const totalPages = Math.ceil(totalProposals / limit);

    res.status(200).json({
      clientUsername: order.clientId.username,
      clientProfilePic: order.clientId.profilePic,
      proposals,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: totalPages,
      totalProposals: totalProposals,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const setPaid = async (req, res) => {
  try {
    const { contractId } = req.body;

    const foundedContract = await contractModel.findOne({
      "artistContracts._id": contractId,
    });
    
    if (!foundedContract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    const contractToUpdate = foundedContract.artistContracts.find(
      contract => contract._id.toString() === contractId
    );

    if (!contractToUpdate) {
      return res.status(404).json({ message: "Contract not found" });
    }

    contractToUpdate.paid = true;
    await foundedContract.save();
    
    res.status(200).json({ message: "Done", foundedContract });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// export async function updateChatProjects(contractIds) {
//   try {
//     const chats = await ChatModel.find({
//       "contracts.contractId": { $in: contractIds },
//     });

//     for (const chat of chats) {
//       for (const contractId of contractIds) {
//         const chatIndex = chat.contracts.findIndex(
//           (contract) => contract.contractId.toString() === contractId.toString()
//         );
//         if (chatIndex !== -1) {
//           const contract = chat.contracts[chatIndex];
//           if (!contract.approvedProject) {
//             const foundedContract = await contractModel.findOne({ "artistContracts._id": contractId });
//             const contractIndex = foundedContract.artistContracts.findIndex(
//               (c) => c._id.toString() === contractId.toString()
//             );
//             if (contractIndex !== -1) {
//               await ProjectModel.create({
//                 artistId: foundedContract.artistId,
//                 title: contract.title,
//                 price: foundedContract.artistContracts[contractIndex].price,
//                 image: contract.pendingProject,
//                 description: foundedContract.artistContracts[contractIndex].description,
//                 category: foundedContract.artistContracts[contractIndex].category,
//                 orderId: foundedContract.artistContracts[contractIndex].orderId,
//                 contractId: foundedContract.artistContracts[contractIndex]._id,
//                 year: contract.year,
//                 clientId: foundedContract.artistContracts[contractIndex].clientId,
//               });
//             }
//             contract.approvedProject = contract.pendingProject;
//             contract.pendingProject = null;
//             contract.projectType = "Approved";
//             chat.contracts[chatIndex] = contract;
//             await chat.save();
//           }
//         }
//       }
//     }
//   } catch (error) {
//     console.error("Error updating chat projects:", error);
//     throw error;
//   }
// }

export const viewAllArtistProjects = async (req, res) => {
  try {
    const artistId = req.params.artistId;
    // const user = req.user;

    // if (user._id.toString() !== artistId.toString()) {
    //   return res.status(403).json({ message: "Unauthorized user" });
    // }

    const { year, category, page, size } = req.query;

    const pipeline = [
      { $match: { artistId: new mongoose.Types.ObjectId(artistId) } },
      { $project: { _id: 1, title: 1, image: 1, year: 1, category: 1 , artistId: 1 } }, 
    ];

    
    if (year) {
      pipeline.push({ $match: { year: parseInt(year) } });
    }

    
    if (category) {
      pipeline.push({ $match: { category: category } });
    }

    const projectsCountPipeline = [...pipeline, { $count: "totalProjects" }];

    let modifiedPipeline = [...pipeline];

    if (page && size) {
      const { limit, skip } = paginatePortraits(req, size);
      modifiedPipeline = modifiedPipeline.concat([
        { $skip: skip },
        { $limit: limit },
      ]);
    }

    const [projects, countResult] = await Promise.all([
      ProjectModel.aggregate(modifiedPipeline),
      ProjectModel.aggregate(projectsCountPipeline),
    ]);

    const totalProjects = countResult.length > 0 ? countResult[0].totalProjects : 0;
    const totalPages = Math.ceil(totalProjects / size) || 1;

    if (projects.length === 0) {
      if (totalProjects === 0) {
        return res.status(200).json({
           message: `No projects found for this artist.` ,
           Projects: projects,
           totalProjects,
         });
      } else {
        return res.status(400).json({
          message: `Requested page and size are not suitable for the number of projects.`,
          Projects: projects,
          currentPage: page,
          totalPages,
          totalProjects,
        });
      }
    }
    if (req.query.page && req.query.size){
      return res.status(200).json({
        Projects: projects,
        currentPage: page,
        totalPages,
        totalProjects,
      });
    } else {
      return res.status(200).json({
        Projects: projects,
        // currentPage: page,
        // totalPages,
        totalProjects,
      });
    }
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

export const viewAllClientProjects = async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const user = req.user;

    if (user._id.toString() !== clientId.toString()) {
      return res.status(403).json({ message: "Unauthorized user" });
    }

    const { year, category, page, size } = req.query;

    const pipeline = [
      { $match: { clientId: new mongoose.Types.ObjectId(clientId) } },
      { $project: { _id: 1, title: 1, image: 1, year: 1, category: 1 , artistId: 1} }, 
    ];

    if (year) {
      pipeline.push({ $match: { year: parseInt(year) } });
    }

    if (category) {
      pipeline.push({ $match: { category: category } });
    }

    const projectsCountPipeline = [...pipeline, { $count: "totalProjects" }];

    let modifiedPipeline = [...pipeline];

    if (page && size) {
      const { limit, skip } = paginatePortraits(req, size);
      modifiedPipeline = modifiedPipeline.concat([
        { $skip: skip },
        { $limit: limit },
      ]);
    }

    const [projects, countResult] = await Promise.all([
      ProjectModel.aggregate(modifiedPipeline),
      ProjectModel.aggregate(projectsCountPipeline),
    ]);

    const totalProjects = countResult.length > 0 ? countResult[0].totalProjects : 0;
    const totalPages = Math.ceil(totalProjects / size) || 1;

    if (projects.length === 0) {
      if (totalProjects === 0) {
        return res.status(200).json({ 
          message: `No projects found for this client.` ,
          Projects: projects,
          totalProjects,
         });
      } else {
        return res.status(400).json({
          message: `Requested page and size are not suitable for the number of projects.`,
          Projects: projects,
          currentPage: page,
          totalPages,
          totalProjects,
        });
      }
    }

    if (req.query.page && req.query.size){
      return res.status(200).json({
        Projects: projects,
        currentPage: page,
        totalPages,
        totalProjects,
      });
    } else {
      return res.status(200).json({
        Projects: projects,
        // currentPage: page,
        // totalPages,
        totalProjects,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

export const viewAllContracts = async (req, res) => {
  try {
    const contractType = req.query.contractType;
    const { page, size } = req.query;

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "artistId",
          foreignField: "_id",
          as: "artistInfo",
        },
      },
      { $unwind: "$artistContracts" },
      {
        $match: contractType
          ? {
              "artistContracts.contractType": {
                $regex: new RegExp(contractType, "i"),
              },
            }
          : {},
      },
      {
        $project: {
          _id: 0,
          contractType: "$artistContracts.contractType",
          clientId: "$artistContracts.clientId",
          price: "$artistContracts.price",
          orderId : "$artistContracts.orderId",
          description: "$artistContracts.description",
          requirements : "$artistContracts.requirements",
          clientSign :  "$artistContracts.clientSign",
          artistSign :  "$artistContracts.artistSign",
          artistApproval :  "$artistContracts.artistApproval",
          clientApproval :  "$artistContracts.clientApproval",
          paid : "$artistContracts.paid",
          price : "$artistContracts.price",
          _id :  "$artistContracts._id",
          createdAt : "$artistContracts.createdAt",
          updatedAt : "$artistContracts.updatedAt",
          artistUsername: { $arrayElemAt: ["$artistInfo.username", 0] },
          artistProfilePic: { $arrayElemAt: ["$artistInfo.profilePic", 0] },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "clientId",
          foreignField: "_id",
          as: "clientInfo",
        },
      },
      {
        $project: {
          contractType: 1,
          clientUsername: { $arrayElemAt: ["$clientInfo.username", 0] },
          clientProfilePic: { $arrayElemAt: ["$clientInfo.profilePic", 0] },
          artistUsername: 1,
          artistProfilePic: 1,
          price: 1,
          description: 1,
          orderId : 1 ,
          requirements : 1 ,
          clientSign : 1 ,
          artistSign : 1 ,
          artistApproval : 1 ,
          clientApproval : 1 ,
          paid : 1,
          price : 1,
          createdAt : 1,
          updatedAt : 1,
          _id : 1,
        },
      },
    ];

    const contractsCountPipeline = [
      { $unwind: "$artistContracts" },
      {
        $match: contractType
          ? {
              "artistContracts.contractType": {
                $regex: new RegExp(contractType, "i"),
              },
            }
          : {},
      },
      { $count: "totalContracts" },
    ];

    let modifiedPipeline = [...pipeline];

    if (page && size) {
      const { limit, skip } = paginatePortraits(req, size);
      modifiedPipeline = modifiedPipeline.concat([
        { $skip: skip },
        { $limit: limit },
      ]);
    }

    const [contracts, countResult] = await Promise.all([
      contractModel.aggregate(modifiedPipeline),
      contractModel.aggregate(contractsCountPipeline),
    ]);

    const totalContracts =
      countResult.length > 0 ? countResult[0].totalContracts : 0;
    const totalPages = Math.ceil(totalContracts / size) || 1;

    if (contracts.length === 0) {
      if (totalContracts === 0) {
        return res
          .status(404)
          .json({ message: `Contract type is not found.`,
          Contracts: contracts
           });
      } else {
        return res.status(400).json({
          message: `Requested page and size are not suitable for the number of contracts matching the contract type.`,
          Contracts: contracts,
          currentPage: page,
          totalPages,
          totalContracts,
        });
      }
    }

    if (req.query.page && req.query.size){
      return res.status(200).json({
       Contracts: contracts,
       currentPage: page,
       totalPages,
       totalContracts,
      });
    } else {
       return res.status(200).json({
       Contracts: contracts,
       totalContracts,
      });
    }
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

cron.schedule('0 0 * * *', async () => {
  await OrderModel.updatePendingOrders();
});
