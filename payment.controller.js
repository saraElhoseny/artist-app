import paypal from "@paypal/checkout-server-sdk";
import { getHerCart } from "./cart.controller.js";
import cartModel from "../models/cart.model.js";
import CourseModel from "../models/course.model.js";
import OrderModel from "../models/order.model.js";
import contractModel from "../models/contract.model.js";
//import { updateChatProjects } from "./order.controller.js";
// import { accessCourse } from "./course.controller.js";
import CommunityModel from "../models/community.model.js";
let idiotId =
  "AWB60WyftTsjQq__SQVxNeF0yO9gbBYKbuH2jM6xQP-SG_R52lL1DXAzOy4_0XMXt0bSEMFVfve6mVYh";
let clientSecret =
  "EDMOH6Ew-a9XmtnihZrlVXuhNQ1J3nEOjjov60VOQrmNtXClRw5BtURTn0JFKZaWmxdrnoW_7j2jO5vf";

let environment = new paypal.core.SandboxEnvironment(idiotId, clientSecret);
let carter;
let userId;
let payType;
let contractIds;
let foundedContracts;
export const paypost = async (req, res, next) => {
  contractIds = req.body.contractIds;
  let value;
  let userCart;
  payType = req.body.payType;
  let totalPrice = req.body.totalPrice;

  if (payType === "Order") {
    try {
      foundedContracts = await contractModel.findOne({
        "artistContracts._id": { $in: contractIds },
      });
      if (!foundedContracts) {
        return res.status(400).json({ message: "Invalid Contract" });
      }
      let orderPrice = 0;
      foundedContracts.artistContracts.forEach((contract) => {
        if (contractIds.includes(contract._id.toString())) {
          orderPrice += contract.price;
        }
      });
      value = orderPrice;
    } catch (error) {
      console.error("Error finding contracts:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  } else {
    try {
      value = totalPrice;
    } catch (error) {
      console.error("Error while paying", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  console.log("Total value:", value);

   userCart = await cartModel.findOne({ clientId: req.user._id });

   value = userCart.totalPrice;
  console.log(userCart);
  console.log(value)
  let client = new paypal.core.PayPalHttpClient(environment);
  let request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: value,
        },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          return_url: `http://localhost:${process.env.PORT}/api/v1/paypal/capture`,
          cancel_url: `http://localhost:${process.env.PORT}/api/v1/paypal/cancel`,
        },
      },
    },
  });

  try {
    const { result } = await client.execute(request);
    res.status(200).json({
      payLink: result.links[1].href,
      cart: userCart,
    });

    carter = userCart;
    userId = req.user._id;
    next();
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getCapture = async (req, res) => {
  const { token } = req.query;

  const client = new paypal.core.PayPalHttpClient(environment);
  const request = new paypal.orders.OrdersCaptureRequest(token);

  request.requestBody({
    final_capture: true,
    note_to_payer: "Thank you for your payment!",
  });

  const { result } = await client.execute(request);
  console.log(carter);

  console.log(result.purchase_units[0].shipping);
  console.log(payType);
  if (payType === "Order") {
    res.redirect("/api/v1/paypal/order");
  } else {
    res.redirect("/api/v1/paypal/success");
  }
};
export let payment = null;

export const getSucess = async (req, res) => {
  res.status(200).json({ message: "Thank you" });
};
export const getSucessforcommunity = async (req, res) => {
  const postIds = carter.communityProjects.map((community) =>
    community.postCollection.map((element) => element._id)
  );
  communityProjects = await CommunityModel.find({ _id: { $in: postIds } });
  if (!communityProjects) {
    return res.status(404).json({ error: "project not found" });
  }
  for (const post of communityProjects) {
    const accessGranted = await CommunityModel.getSucessforcommunity(
      userId,
      postIds
    );
    if (!accessGranted) {
      return res.status(500).json({ error: "Failed " });
    }
  }
  res
    .status(200)
    .json({ message: "Thank you", success: communityProjects, cart: carter });
};
// export const setPaid = async (req, res) => {
//   try {
//     // const { contractIds } = req.body;
//     //const { paid } = req.body;

//     const findContracts = await contractModel.find({
//       "artistContracts._id": { $in: contractIds },
//     });
//     // for (const foundedContract of findContracts) {
//     //   const contractsToUpdate = findContracts.artistContracts.filter(
//     //     (contract) => contractIds.includes(contract._id.toString())
//     //   );
//     //   for (const contract of contractsToUpdate) {
//     //     contract.paid = true;
//     //   }
//     findContracts.forEach((contract) =>
//       contract.artistContracts.forEach((pay) => {
//         if (contractIds.includes(pay._id.toString())) {
//           pay.paid = true;
//         }
//       })
//     );
//     await Promise.all(findContracts.map((contract) => contract.save()));
//     const updatedContracts = await contractModel.find({
//       "artistContracts._id": { $in: contractIds },
//     });

//     res
//       .status(200)
//       .json({ message: "Done popo", foundedContracts: updatedContracts });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };
export const setPay = async (req, res) => {
  try {
    //const { contractIds } = req.body;

    const findContracts = await contractModel.findOne({
      "artistContracts._id": { $in: contractIds },
    });
    if (!findContracts) {
      return res.status(404).json({ message: "Contracts not found" });
    }
    // findContracts.forEach((contract) =>
    //   contract.artistContracts.forEach((pay) => {
    //     if (contractIds.includes(pay._id.toString())) {
    //       pay.paid = true;
    //     }
    //   })
    // );
    let updatedContracts;
    for (const contract of findContracts.artistContracts) {
      if (contractIds.includes(contract._id.toString())) {
        if (contract.paid === true) {
          return res.status(404).json({ message: "Contract is paid already" });
        }
        if (!contract.artistSign) {
          return res.status(404).json({ message: "Contract is not signed" });
        }
        contract.paid = true;
        await findContracts.save();

        updatedContracts = contract;
        break;
      }
    }
    res.status(200).json({ message: "Done popo" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getCancel = (req, res) => res.send("Cancelled");
export const world = (req, res) => {
  return res.send("Hello, world!");
};
