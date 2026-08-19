import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import MaterialRequest from "@/models/MaterialRequest";
import MaterialPurchase from "@/models/MaterialPurchase";
import Vendor from "@/models/Vendor";
import { withAuth } from "@/lib/middleware";
import nodemailer from "nodemailer";

export const POST = withAuth(async function (req, { params }) {
  try {
    const { id: projectId, requestId: mrId } = await params;
    await dbConnect();
    
    const { vendorId, itemPrices, advancePayment, sendEmail } = await req.json();

    const mr = await MaterialRequest.findOne({ 
      _id: mrId, 
      project: projectId,
      organization: req.user.organizationId 
    });

    if (!mr) {
      return NextResponse.json({ message: "Material Request not found" }, { status: 404 });
    }

    if (mr.status !== "Approved") {
      return NextResponse.json({ message: "Material Request must be approved first" }, { status: 400 });
    }

    const vendor = await Vendor.findOne({ _id: vendorId, organization: req.user.organizationId });
    if (!vendor) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

    // Construct PO Items based on approved quantities
    let grandTotal = 0;
    const poItems = [];

    for (const item of mr.items) {
      if (item.approvedQuantity > 0) {
        // itemPrices should be an object mapping materialId to unitPrice
        const unitPrice = itemPrices[item.materialId.toString()] || 0;
        const totalPrice = unitPrice * item.approvedQuantity;
        grandTotal += totalPrice;

        poItems.push({
          materialId: item.materialId,
          quantity: item.approvedQuantity,
          unit: item.unit,
          unitPrice,
          totalPrice
        });
      }
    }

    if (poItems.length === 0) {
      return NextResponse.json({ message: "No approved items to generate PO for" }, { status: 400 });
    }

    const remainingBalance = grandTotal - (advancePayment || 0);

    // Generate PO Number
    const count = await MaterialPurchase.countDocuments({ organization: req.user.organizationId });
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const purchase = await MaterialPurchase.create({
      project: projectId,
      organization: req.user.organizationId,
      purchasedBy: req.user.id,
      purchasedByName: req.user.name,
      vendorName: vendor.name,
      poNumber: poNumber,
      items: poItems,
      grandTotal,
      advancePayment: advancePayment || 0,
      remainingBalance,
      paymentStatus: remainingBalance <= 0 ? "Paid" : (advancePayment > 0 ? "Partial" : "Unpaid"),
      status: "Approved", // Skipping pending approval as per user instruction
      commonNote: `Generated from MR ${mrId}`
    });

    // Update MR Status to Fulfilled
    mr.status = "Fulfilled";
    await mr.save();

    const { emitToProject } = await import("@/lib/socket-server");
    emitToProject(projectId, 'material:updated');

    // Send Email to Vendor if requested
    if (sendEmail && vendor.email) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const emailHtml = `
          <h2>Purchase Order: ${poNumber}</h2>
          <p>Dear ${vendor.contactPerson || vendor.name},</p>
          <p>Please find the details for the new Purchase Order below:</p>
          <table border="1" cellpadding="8" style="border-collapse: collapse;">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Price</th>
              </tr>
            </thead>
            <tbody>
              ${poItems.map(i => `
                <tr>
                  <td>${i.materialId}</td> <!-- In a real scenario, populate material name -->
                  <td>${i.quantity} ${i.unit || ''}</td>
                  <td>${i.unitPrice}</td>
                  <td>${i.totalPrice}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p><strong>Grand Total:</strong> ${grandTotal}</p>
          <p><strong>Advance Payment:</strong> ${advancePayment || 0}</p>
          <p><strong>Remaining Balance:</strong> ${remainingBalance}</p>
          <p>Thank you.</p>
        `;

        await transporter.sendMail({
          from: `"SkyLite Construction" <${process.env.SMTP_USER}>`,
          to: vendor.email,
          subject: `Purchase Order - ${poNumber}`,
          html: emailHtml
        });
      } catch (emailError) {
        console.error("Failed to send PO email to vendor:", emailError);
        // Continue, don't fail the PO creation if email fails
      }
    }

    return NextResponse.json({ message: "PO Generated Successfully", purchase });
  } catch (error) {
    console.error("Generate PO error:", error);
    return NextResponse.json({ message: "Error generating PO" }, { status: 500 });
  }
});
