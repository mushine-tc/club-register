export default async function handler(req,res){

 const {seat,id}=req.body;

 res.json({
  success:true,
  className:"三年1班",
  userName:"aa"
 });

}
