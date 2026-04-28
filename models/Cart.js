const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    userName: {
        type: String,
        default: ""
    },
    userEmail: {
        type: String,
        default: ""
    },
    items: [
        {
            name: String,
            price: Number,
            quantity: {
                type: Number,
                default: 1
            },
            image: String
        }
    ],
    appliedOfferCode: {
        type: String,
        default: ""
    },
    appliedOfferLabel: {
        type: String,
        default: ""
    }
}, { timestamps: true });

module.exports = mongoose.model("Cart", cartSchema);