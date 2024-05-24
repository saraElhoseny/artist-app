import { Router } from "express";
import { auth, roles } from "../middlewares/auth.js";
import * as coursecontroller from "../controllers/course.controller.js";
import router from "./auth.routes.js";
import { endpoints } from "../validation/auth.endpoints.js";

//import { endPoints } from "../validation/course.endpoints.js";

router.post("/", auth([roles.Artist, roles.Admin]), coursecontroller.addCourse);
router.put("/:courseid",auth([roles.Artist, roles.Admin]),coursecontroller.updateCourse
);

router.delete( "/:courseid/delete", auth([roles.Artist, roles.Admin]),coursecontroller.deletecourse
);
 
   
router.post( "/:courseId/rate", auth([roles.Artist, roles.Client]), coursecontroller.courseRate
);
 
  router.get("/all", coursecontroller.courses);
router.post("/enrollCourse",auth([roles.Artist, roles.Client]),coursecontroller.enrollInCourse
);
  
  
  
// router.get(
//   "/userCourseGetter/:id",

//   coursecontroller.getCourseByUserId
// );
export default router;
