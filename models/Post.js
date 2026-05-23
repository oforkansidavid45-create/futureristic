const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({

user:String,

text:String,

image:String,

video:String,

profilePic:String,

likes:{
type:Number,
default:0
},

likedBy:{
type:[String],
default:[]
},

comments:[
{
user:String,
text:String
}
]

},{
timestamps:true
});

module.exports =
mongoose.model("Post", postSchema);