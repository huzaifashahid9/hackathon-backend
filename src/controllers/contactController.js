import Contact from "../models/Contact.js";
import { sendEmail } from "../config/email.js";

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
export const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message, phone } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Create contact submission
    const contact = await Contact.create({
      name,
      email,
      subject,
      message,
      phone,
    });

    // Send confirmation email to user
    try {
      await sendEmail({
        to: email,
        subject: "✅ We received your message - HealthMate",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0EA5E9 0%, #10B981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #F9FAFB; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
              h1 { margin: 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💚 Thank You for Contacting HealthMate!</h1>
              </div>
              <div class="content">
                <p>Dear ${name},</p>
                <p>We have received your message and will get back to you as soon as possible.</p>
                <p><strong>Your Message:</strong></p>
                <p style="background: white; padding: 15px; border-left: 4px solid #0EA5E9; border-radius: 4px;">
                  ${message}
                </p>
                <p>Our team will review your inquiry and respond within 24-48 hours.</p>
                <p>In the meantime, feel free to explore our platform!</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 HealthMate. All rights reserved.</p>
                <p>Sehat ka Smart Dost 💚</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
      // Continue even if email fails
    }

    // Send notification to admin
    try {
      const adminEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
      await sendEmail({
        to: adminEmail,
        subject: "🔔 New Contact Form Submission - HealthMate",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
              .content { background: #F9FAFB; padding: 20px; }
              .detail-row { padding: 10px 0; border-bottom: 1px solid #E5E7EB; }
              .label { font-weight: 600; color: #6B7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔔 New Contact Submission</h1>
              </div>
              <div class="content">
                <div class="detail-row">
                  <span class="label">Name:</span> ${name}
                </div>
                <div class="detail-row">
                  <span class="label">Email:</span> ${email}
                </div>
                ${phone ? `<div class="detail-row"><span class="label">Phone:</span> ${phone}</div>` : ""}
                <div class="detail-row">
                  <span class="label">Subject:</span> ${subject}
                </div>
                <div class="detail-row">
                  <span class="label">Message:</span><br>${message}
                </div>
                <div class="detail-row">
                  <span class="label">Submitted:</span> ${new Date().toLocaleString()}
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });
    } catch (adminEmailError) {
      console.error("Error sending admin notification:", adminEmailError);
    }

    res.status(201).json({
      success: true,
      message: "Your message has been sent successfully! We'll get back to you soon.",
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
      },
    });
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit contact form. Please try again.",
      error: error.message,
    });
  }
};

// @desc    Get all contact submissions (Admin only)
// @route   GET /api/contact
// @access  Private/Admin
export const getAllContacts = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Contact.countDocuments(query);

    res.status(200).json({
      success: true,
      data: contacts,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contacts",
      error: error.message,
    });
  }
};

// @desc    Get single contact by ID
// @route   GET /api/contact/:id
// @access  Private/Admin
export const getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact submission not found",
      });
    }

    res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("Get contact error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contact",
      error: error.message,
    });
  }
};

// @desc    Update contact status
// @route   PATCH /api/contact/:id
// @access  Private/Admin
export const updateContactStatus = async (req, res) => {
  try {
    const { status, response } = req.body;

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact submission not found",
      });
    }

    if (status) {
      contact.status = status;
    }

    if (response) {
      contact.response = response;
      contact.respondedBy = req.user?.name || "Admin";
      contact.respondedAt = new Date();
    }

    await contact.save();

    res.status(200).json({
      success: true,
      message: "Contact updated successfully",
      data: contact,
    });
  } catch (error) {
    console.error("Update contact error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update contact",
      error: error.message,
    });
  }
};

// @desc    Delete contact
// @route   DELETE /api/contact/:id
// @access  Private/Admin
export const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact submission not found",
      });
    }

    await contact.deleteOne();

    res.status(200).json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete contact",
      error: error.message,
    });
  }
};
