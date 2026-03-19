import mongoose, {Schema} from "mongoose";

const subscriptionSchem = new Schema({
    subsciber : {
        type: Schema.Types.ObjectId,
        ref: "User"
    },

    channel: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
},{timestamps: true})

export const Subscription = mongoose.model("Subscription", subscriptionSchem);
