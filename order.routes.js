import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { endpoints } from "../validation/order.endpoints.js";
import * as orderController from "../controllers/order.controller.js";

const router = Router();

router.route("/createOrder/").post(auth(endpoints.createOrder), orderController.createOrder);
router.route("/deleteOrder/:orderId").delete(auth(endpoints.createOrder), orderController.deleteOrder);
router.route("/applyForProject/:orderId").post(auth(endpoints.applyForProject), orderController.applyForProject);
router.route("/acceptArtistProposal/:orderId").post(auth(endpoints.createOrder), orderController.acceptArtistProposal);
router.route("/artistContractDecision/:contractId").patch(auth(endpoints.applyForProject), orderController.artistContractDecision);
router.route("/createProject/:contractId").post(auth(endpoints.applyForProject), orderController.createProject);
router.route("/reviewArtist/:artistId").post(auth(endpoints.createOrder), orderController.reviewArtist);
router.route("/rateProject").post(auth(endpoints.createOrder), orderController.rateProject);
router.route("/allContracts/:artistId").get(auth(endpoints.applyForProject), orderController.viewAllArtistContracts);
router.route("/clientContracts/:clientId").get(auth(endpoints.createOrder), orderController.viewClientContracts);
router.route("/specContract/:contractId").get(auth(endpoints.homepage), orderController.viewSpecificContract);
//router.route("/homePage").get(auth(endpoints.homepage),orderController.homePage)
router.route("/clientProfile/:clientId").get(orderController.clientProfile);
router.route("/projectDetails/:orderId").get(orderController.viewProjectDetails);
router.route("/orderProposals/:clientId/:orderId").get(orderController.viewProjectProposals);
router.route("/AllOrders").get(orderController.viewAllOrders);
router.route("/AllArtists").get(orderController.viewAllArtists);
router.route("/viewArtistReviews/:artistId").get(orderController.viewArtistReviews);
router.route("/createContract/:orderId").post(auth(endpoints.createOrder), orderController.createContract);
router.route("/set").post(orderController.setPaid);
// router.route("/viewChatProjectsForArtist/:chatId").get(auth(endpoints.applyForProject),orderController.viewChatProjectsForArtist);
// router.route("/viewChatProjectsForClient/:chatId").get(auth(endpoints.createOrder), orderController.viewChatProjectsForClient);
router.route("/artistProjects/:artistId").get(orderController.viewAllArtistProjects);
router.route("/clientProjects/:clientId").get(auth(endpoints.createOrder), orderController.viewAllClientProjects);
router.route("/allAdminContracts").get(auth(endpoints.all), orderController.viewAllContracts);
export default router;
