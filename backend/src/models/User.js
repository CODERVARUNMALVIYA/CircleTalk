import mongoose from "mongoose";



const userSchema = new mongoose.Schema({
FullNmae : {type:String,
required:true},

email : {type:String,
required:true,
unique:true},

password : {type:String,
required:true,
minlength:6       
},
bio : {type:String,
default:"Hey there! I am using CircleTalk"
},
profilePic : {type:String,
default:"https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"            
},
nativeLanguage : {type:String,
default:"English"            
},
lerningLanguage : {type:String,
default:"Spanish"            
},
location : {type:String,
default:"Earth"            
},
isOnboarded : {type:Boolean,
default:false            
},
friends : [{type:mongoose.Schema.Types.ObjectId,
ref:"user"}],


},{timestamps:true})

const User = mongoose.model("User",userSchema);

//pre hook
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }   
});
export default User;