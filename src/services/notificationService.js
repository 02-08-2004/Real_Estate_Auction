import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import emailjs from 'emailjs-com';

// Mock IDs based on existing usage in the app
const EMAILJS_SERVICE_ID = 'service_j1wtd27';
const EMAILJS_USER_ID = 'jnnB0VoKMvN1uwhW1';
const EMAILJS_TEMPLATE_GENERIC = 'template_adukcqw';

/**
 * Service to handle all project notifications (Bell & Email)
 */
export const notificationService = {
  /**
   * Send a bell notification in Firestore
   */
  async sendBell(userId, message, details = {}) {
    try {
      await addDoc(collection(db, "notifications"), {
        userId,
        message,
        read: false,
        createdAt: serverTimestamp(),
        ...details
      });
    } catch (e) {
      console.error("Error sending bell notification:", e);
    }
  },

  /**
   * Send an email via EmailJS
   */
  async sendEmail(toEmail, toName, subject, htmlMessage) {
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_GENERIC, {
        to_email: toEmail,
        name: toName,
        subject: subject,
        html_message: htmlMessage
      }, EMAILJS_USER_ID);
    } catch (e) {
      console.error("Error sending email:", e);
    }
  },

  /**
   * Notify seller of Admin decision
   */
  async notifySellerDecision(property, decision, reason = "") {
    const statusMap = {
      approved: "Congratulations! Your property request has been approved.",
      rejected: "Your property request was declined."
    };

    const msg = statusMap[decision] || `Your property status updated to ${decision}.`;
    const fullMsg = reason ? `${msg} Reason: ${reason}` : msg;

    // Send Bell
    await this.sendBell(property.sellerId, fullMsg, {
      type: "admin_decision",
      propertyId: property.id,
      decision
    });

    // Send Email
    await this.sendEmail(
      property.sellerEmail,
      property.sellerName,
      `Property Update: ${property.title}`,
      `<p>${fullMsg}</p><p>Property: <strong>${property.title}</strong></p>`
    );
  },

  /**
   * Notify winner and seller of auction end
   */
  async notifyAuctionEnd(property, winner) {
    // Notify Winner
    await this.sendBell(winner.bidderId, `Congratulations! You won the auction for "${property.title}"!`, {
      type: "auction_won",
      propertyId: property.id
    });
    await this.sendEmail(
      winner.bidderEmail,
      winner.bidderName,
      `You Won! ${property.title}`,
      `<p>Successful! You won the land "${property.title}" with a bid of ₹${winner.amount.toLocaleString()}. Please sign the agreement to proceed.</p>`
    );

    // Notify Seller
    await this.sendBell(property.sellerId, `Success! Your property "${property.title}" has been sold.`, {
      type: "property_sold",
      propertyId: property.id
    });
    await this.sendEmail(
      property.sellerEmail,
      property.sellerName,
      `Property Sold! ${property.title}`,
      `<p>Congratulations! Your property "${property.title}" was successfully sold for ₹${winner.amount.toLocaleString()}. Please wait for the bidder to sign the agreement.</p>`
    );
  },

  /**
   * Notify one party that the other has signed
   */
  async notifySignature(receiverId, receiverEmail, receiverName, property, signerRole) {
    const msg = `${signerRole === 'bidder' ? 'The bidder' : 'The seller'} has signed the agreement for "${property.title}". ${signerRole === 'bidder' ? 'It\'s your turn to sign!' : 'The agreement is now fully executed.'}`;
    
    await this.sendBell(receiverId, msg, {
      type: "agreement_update",
      propertyId: property.id
    });

    await this.sendEmail(
      receiverEmail,
      receiverName,
      `Agreement Update: ${property.title}`,
      `<p>${msg}</p>`
    );
  },

  async notifyAgreementCompleted(property, winner) {
    const subject = `Agreement Completed: ${property.title}`;
    const message = `The agreement for "${property.title}" is fully signed by buyer and seller. You can download the final agreement record from the agreement page.`;

    await this.sendBell(winner.bidderId, message, {
      type: "agreement_completed",
      propertyId: property.id
    });
    await this.sendBell(property.sellerId, message, {
      type: "agreement_completed",
      propertyId: property.id
    });

    await this.sendEmail(winner.bidderEmail, winner.bidderName, subject, `<p>${message}</p>`);
    await this.sendEmail(property.sellerEmail, property.sellerName, subject, `<p>${message}</p>`);
  },

  /**
   * Notify bidder of participation decision
   */
  async notifyBidderDecision(bidderId, bidderEmail, bidderName, propertyTitle, decision, reason = "") {
    const msg = decision === 'approved' 
      ? `Congratulations! Your participation request for "${propertyTitle}" has been approved. You can now place bids.`
      : `Your participation request for "${propertyTitle}" was declined. ${reason ? 'Reason: ' + reason : ''}`;

    await this.sendBell(bidderId, msg, {
      type: "participation_decision",
      decision
    });

    await this.sendEmail(
      bidderEmail,
      bidderName,
      `Auction Participation: ${propertyTitle}`,
      `<p>${msg}</p>`
    );
  }
};
