import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Service for handling property-related actions in Firestore.
 */
export const propertyService = {
  /**
   * Schedules an auction for a property.
   * @param {string} propertyId - The ID of the property to schedule.
   * @param {Date} endDate - The end date for the auction.
   */
  async scheduleAuction(propertyId, startDate, endDate) {
    const propRef = doc(db, "properties", propertyId);
    return updateDoc(propRef, {
      status: "scheduled",
      approved: true, // redundancy
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      registeredCount: 0,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Increments the registered bidder count for a property.
   * @param {string} propertyId - The ID of the property.
   */
  async incrementBidderCount(propertyId) {
    const propRef = doc(db, "properties", propertyId);
    return updateDoc(propRef, {
      registeredCount: increment(1)
    });
  },

  /**
   * Rejects a property listing.
   */
  async rejectListing(propertyId, reason) {
    const propRef = doc(db, "properties", propertyId);
    return updateDoc(propRef, {
      status: "rejected",
      approved: false,
      rejectedReason: reason,
      updatedAt: serverTimestamp()
    });
  },


  /**
   * Finalizes an auction by declaring a winner.
   */
  async finalizeAuction(property, winner) {
    const propRef = doc(db, "properties", property.id);
    return updateDoc(propRef, {
      status: "contract_pending",
      winnerId: winner.bidderId,
      winnerName: winner.bidderName,
      winnerEmail: winner.bidderEmail,
      winnerAmount: winner.amount,
      endedAt: serverTimestamp()
    });
  },

  /**
   * Approves a bidder's participation request.
   */
  async approveBidderParticipation(propertyId, bidderId) {
    const bidderRef = doc(db, "properties", propertyId, "registeredBidders", bidderId);
    return updateDoc(bidderRef, {
      verificationStatus: "approved",
      approvedAt: serverTimestamp()
    });
  },

  /**
   * Rejects a bidder's participation request.
   */
  async rejectBidderParticipation(propertyId, bidderId, reason) {
    const bidderRef = doc(db, "properties", propertyId, "registeredBidders", bidderId);
    return updateDoc(bidderRef, {
      verificationStatus: "rejected",
      rejectionReason: reason,
      rejectedAt: serverTimestamp()
    });
  },

  /**
   * Marks a notification as read.
   * @param {string} notificationId - The ID of the notification.
   */
  async markNotificationRead(notificationId) {
    const notifRef = doc(db, "notifications", notificationId);
    return updateDoc(notifRef, { read: true });
  }
};
