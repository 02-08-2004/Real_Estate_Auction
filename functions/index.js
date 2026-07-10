const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Scheduled function to check for upcoming auctions every minute.
 * Sends reminders to registered bidders 5 minutes before the auction starts.
 */
exports.checkUpcomingAuctions = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const fiveMinsFromNow = admin.firestore.Timestamp.fromMillis(now.toMillis() + 5 * 60 * 1000);
    const sixMinsFromNow = admin.firestore.Timestamp.fromMillis(now.toMillis() + 6 * 60 * 1000);

    // Query auctions starting in ~5 minutes (narrow window to avoid missing/double triggers)
    const upcomingSnap = await db.collection('properties')
        .where('status', '==', 'scheduled')
        .where('startDate', '>', now)
        .where('startDate', '<=', sixMinsFromNow)
        .get();

    if (upcomingSnap.empty) return null;

    const tasks = [];

    for (const doc of upcomingSnap.docs) {
        const property = { id: doc.id, ...doc.data() };
        
        // Get all registered bidders for this property
        const biddersSnap = await db.collection('properties').doc(property.id).collection('registeredBidders').get();
        
        biddersSnap.forEach(bidderDoc => {
            const bidder = bidderDoc.data();
            const bidderId = bidderDoc.id;

            // 1. Create Bell Notification in Firestore
            tasks.push(db.collection('notifications').add({
                userId: bidderId,
                message: `🚀 Get ready! The auction for "${property.title}" starts in 5 minutes.`,
                type: "auction_reminder_start",
                propertyId: property.id,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }));

            // 2. Trigger Email (Assuming 'Trigger Email' extension is installed and listening to 'mail' collection)
            tasks.push(db.collection('mail').add({
                to: bidder.email || bidder.bidderEmail,
                message: {
                    subject: `Auction Starting Soon: ${property.title}`,
                    html: `<p>Your registered auction for <strong>${property.title}</strong> starts in 5 minutes!</p><p>Property Link: <a href="https://house-bidding-platform.web.app/auction/${property.id}">View Auction</a></p>`,
                }
            }));
        });
    }

    await Promise.all(tasks);
    console.log(`Processed ${upcomingSnap.size} auctions for background reminders.`);
    return null;
});
