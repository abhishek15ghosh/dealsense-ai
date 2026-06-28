import dbConnect from '@/lib/mongodb';
import Notification, { INotification } from '@/models/Notification';
import Watchlist from '@/models/Watchlist';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'price_drop' | 'alert_triggered' | 'ai_recommendation' | 'system',
  productId?: string
): Promise<INotification> {
  await dbConnect();
  return await Notification.create({
    userId,
    productId,
    title,
    message,
    type,
    isRead: false,
    createdAt: new Date()
  });
}

export async function getUserNotifications(userId: string): Promise<INotification[]> {
  await dbConnect();
  return await Notification.find({ userId }).sort({ createdAt: -1 }).exec();
}

export async function markAsRead(notificationId: string): Promise<INotification | null> {
  await dbConnect();
  return await Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true }
  ).exec();
}

export async function markAllAsRead(userId: string): Promise<void> {
  await dbConnect();
  await Notification.updateMany(
    { userId, isRead: false },
    { isRead: true }
  ).exec();
}

export async function triggerWatchlistNotificationForBuyNow(productId: string, productName: string): Promise<void> {
  await dbConnect();
  const watchlists = await Watchlist.find({ productId }).exec();
  
  for (const w of watchlists) {
    // Check if notification already exists to avoid duplicate notifications
    const existing = await Notification.findOne({
      userId: w.userEmail,
      productId,
      type: 'ai_recommendation',
      title: 'Strong Buying Opportunity'
    }).exec();

    if (!existing) {
      await createNotification(
        w.userEmail,
        'Strong Buying Opportunity',
        `${productName} is currently near its historical low price.`,
        'ai_recommendation',
        productId
      );
    }
  }
}
