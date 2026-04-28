const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [
    {
      name: String,
      price: Number,
      quantity: Number,
      image: String
    }
  ],
  pricing: {
    itemTotal: {
      type: Number,
      default: 0
    },
    deliveryFee: {
      type: Number,
      default: 0
    },
    taxes: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    grandTotal: {
      type: Number,
      default: 0
    }
  },
  appliedOffer: {
    code: {
      type: String,
      default: ""
    },
    label: {
      type: String,
      default: ""
    }
  },
  etaMinutes: {
    type: Number,
    default: 30
  },
  paymentMethod: {
    type: String,
    default: "cod"
  },
  paymentStatus: {
    type: String,
    default: "cash_on_delivery"
  },
  status: {
    type: String,
    default: "placed"
  }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
