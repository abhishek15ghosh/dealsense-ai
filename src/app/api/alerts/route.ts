import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Alert from '@/models/Alert';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';

// GET: Fetch all alerts set by a user email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenUser = await getAuthUser(request);
    const resolvedEmail = tokenUser?.email || (searchParams.get('email') === 'demo@dealsense.ai' ? 'demo@dealsense.ai' : '');

    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const userAlerts = await Alert.find({ userEmail: resolvedEmail }).sort({ createdAt: -1 });

    const ProductSource = (await import('@/models/ProductSource')).default;
    const Product = (await import('@/models/Product')).default;

    const formattedAlerts = await Promise.all(
      userAlerts.map(async (a) => {
        let latestPrice = a.currentPrice;

        // Try to find the latest platform specific price
        const storeSource = await ProductSource.findOne({ productId: a.productId, platform: a.storeName });
        if (storeSource) {
          latestPrice = storeSource.currentPrice;
        } else {
          // Fallback to canonical product best deal price
          const prod = await Product.findOne({ customId: a.productId });
          if (prod) {
            latestPrice = prod.bestDealPrice;
          }
        }

        // Fallback if none of the above got a valid price
        if (latestPrice === undefined || latestPrice === null) {
          latestPrice = a.currentPriceAtSet;
        }

        let isTriggered = a.isTriggered;
        let status = a.status || 'active';
        let triggeredAt = a.triggeredAt;

        // If active alert is now meeting the target price threshold, trigger it
        if (status === 'active' && latestPrice <= a.targetPrice) {
          isTriggered = true;
          status = 'triggered';
          triggeredAt = triggeredAt || new Date();

          // Update database document
          a.isTriggered = true;
          a.status = 'triggered';
          a.triggeredAt = triggeredAt;
          a.currentPrice = latestPrice;
          await a.save();

          // Trigger notification
          const { createNotification } = await import('@/services/notificationService');
          await createNotification(
            a.userEmail,
            "Price Target Reached",
            `${a.productName} is now ₹${latestPrice.toLocaleString('en-IN')} and has reached your target price of ₹${a.targetPrice.toLocaleString('en-IN')}.`,
            "alert_triggered"
          );

          // Trigger email if not already sent
          if (!a.emailSentAt) {
            try {
              const { sendPriceTargetReachedEmail } = await import('@/services/emailService');
              await sendPriceTargetReachedEmail(a, latestPrice);
            } catch (emailErr) {
              console.error('Error sending alert email on GET check:', emailErr);
            }
          }
        } else if (status === 'active' && latestPrice !== a.currentPrice) {
          // Update current price of the alert in database
          a.currentPrice = latestPrice;
          await a.save();
        }

        return {
          id: a._id.toString(),
          productId: a.productId,
          productName: a.productName,
          productImage: a.productImage,
          targetPrice: a.targetPrice,
          currentPriceAtSet: a.currentPriceAtSet,
          currentPrice: latestPrice,
          isTriggered,
          status,
          storeName: a.storeName,
          createdAt: a.createdAt,
          triggeredAt
        };
      })
    );

    return NextResponse.json({ success: true, data: formattedAlerts }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Alerts GET Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST: Register a new price alert
export async function POST(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const body = await request.json();
    const { email, productId, targetPrice, storeName } = body;

    const resolvedEmail = tokenUser?.email || (email === 'demo@dealsense.ai' ? 'demo@dealsense.ai' : '');
    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!productId || !targetPrice || !storeName) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    await dbConnect();

    // Query core product details to auto-fill metadata
    const product = await Product.findOne({ customId: productId });
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Find the latest price for this store if exists, else fallback to bestDealPrice
    const ProductSource = (await import('@/models/ProductSource')).default;
    const storeSource = await ProductSource.findOne({ productId, platform: storeName });
    const currentPrice = storeSource ? storeSource.currentPrice : product.bestDealPrice;

    const isTriggered = currentPrice <= Number(targetPrice);

    const newAlert = await Alert.create({
      userEmail: resolvedEmail,
      userId: resolvedEmail,
      productId,
      productName: product.name,
      productImage: product.image,
      targetPrice: Number(targetPrice),
      currentPriceAtSet: product.bestDealPrice,
      currentPrice,
      storeName,
      platform: storeName,
      isTriggered,
      status: isTriggered ? 'triggered' : 'active',
      triggeredAt: isTriggered ? new Date() : undefined
    });

    if (isTriggered) {
      const { createNotification } = await import('@/services/notificationService');
      await createNotification(
        resolvedEmail,
        "Price Target Reached",
        `${product.name} is now ₹${currentPrice.toLocaleString('en-IN')} and has reached your target price of ₹${Number(targetPrice).toLocaleString('en-IN')}.`,
        "alert_triggered"
      );

      // Trigger email alert
      try {
        const { sendPriceTargetReachedEmail } = await import('@/services/emailService');
        await sendPriceTargetReachedEmail(newAlert, currentPrice);
      } catch (emailErr) {
        console.error('Error sending alert email on POST creation:', emailErr);
      }
    }

    const formattedAlert = {
      id: newAlert._id.toString(),
      productId: newAlert.productId,
      productName: newAlert.productName,
      productImage: newAlert.productImage,
      targetPrice: newAlert.targetPrice,
      currentPriceAtSet: newAlert.currentPriceAtSet,
      currentPrice: newAlert.currentPrice || newAlert.currentPriceAtSet,
      isTriggered: newAlert.isTriggered,
      status: newAlert.status || 'active',
      storeName: newAlert.storeName,
      createdAt: newAlert.createdAt
    };

    return NextResponse.json({ success: true, data: formattedAlert }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Alerts POST Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE: Cancel/delete an alert by updating status to 'cancelled'
export async function DELETE(request: NextRequest) {
  try {
    const tokenUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const alertId = searchParams.get('id');

    const resolvedEmail = tokenUser?.email || (email === 'demo@dealsense.ai' ? 'demo@dealsense.ai' : '');
    if (!resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!alertId) {
      return NextResponse.json({ success: false, error: 'Alert ID parameter is required' }, { status: 400 });
    }

    await dbConnect();
    
    // Find alert first to check ownership
    const alert = await Alert.findById(alertId);
    if (!alert) {
      return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
    }

    if (alert.userEmail !== resolvedEmail) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    alert.status = 'cancelled';
    await alert.save();

    return NextResponse.json({ success: true, message: 'Alert cancelled successfully' }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Alerts DELETE Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
