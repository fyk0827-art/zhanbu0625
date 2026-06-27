package com.lifeblueprint.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.commonmark.node.Node;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final Parser mdParser;
    private final HtmlRenderer mdRenderer;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
        this.mdParser = Parser.builder().build();
        this.mdRenderer = HtmlRenderer.builder().build();
    }

    public void sendReport(String to, String reportId, String reportText, String displayName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("divinlove100@gmail.com");
            helper.setTo(to);
            helper.setSubject("Your Life Blueprint Report is Ready");

            String html = buildReportEmail(reportId, reportText, displayName);
            helper.setText(html, true);

            mailSender.send(message);
            System.out.println("[EmailService] Report email sent successfully to " + to);
        } catch (MessagingException e) {
            System.err.println("[EmailService] Failed to send report email to " + to + ": " + e.getMessage());
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }

    public void sendTestEmail(String to) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");

            helper.setFrom("divinlove100@gmail.com");
            helper.setTo(to);
            helper.setSubject("PRISM - Test Email");
            helper.setText("This is a test email from PRISM Life Script.\n\nIf you received this, SMTP is working correctly.\n\nTimestamp: " + System.currentTimeMillis(), false);

            mailSender.send(message);
            System.out.println("[EmailService] Test email sent successfully to " + to);
        } catch (MessagingException e) {
            System.err.println("[EmailService] Failed to send test email to " + to + ": " + e.getMessage());
            throw new RuntimeException("Failed to send test email: " + e.getMessage(), e);
        }
    }

    private String buildReportEmail(String reportId, String reportText, String displayName) {
        String name = displayName != null ? displayName : "Your Report";
        String reportHtml = reportText != null ? mdToHtml(reportText) : "";

        return """
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"/><style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0D1B2A; color: #E8DCC8; padding: 0; }
              .email-wrap { max-width: 680px; margin: 0 auto; background: #1A0F2E; }
              .header { text-align: center; padding: 36px 32px 24px; border-bottom: 1px solid rgba(232,200,122,0.12); }
              .header h1 { color: #E8C87A; font-size: 22px; margin: 0 0 6px; font-weight: 700; letter-spacing: 1px; }
              .header p { color: rgba(232,220,200,0.45); font-size: 12px; margin: 0; }
              .report-body { padding: 24px 32px 32px; font-size: 14px; line-height: 1.8; color: #E8DCC8; }
              .report-body h1, .report-body h2, .report-body h3, .report-body h4 { color: #E8C87A; margin: 24px 0 12px; font-weight: 600; }
              .report-body h1 { font-size: 20px; border-bottom: 1px solid rgba(232,200,122,0.12); padding-bottom: 8px; }
              .report-body h2 { font-size: 17px; }
              .report-body h3 { font-size: 15px; }
              .report-body h4 { font-size: 14px; }
              .report-body p { margin: 0 0 10px; color: #E8DCC8; }
              .report-body strong { color: #f0e6d3; font-weight: 600; }
              .report-body ul, .report-body ol { margin: 0 0 10px 20px; color: #E8DCC8; }
              .report-body li { margin-bottom: 4px; }
              .report-body hr { border: none; border-top: 1px solid rgba(232,200,122,0.1); margin: 20px 0; }
              .report-body blockquote { border-left: 3px solid #E8C87A; padding-left: 14px; margin: 10px 0; color: rgba(232,220,200,0.65); font-style: italic; }
              .report-body code { background: rgba(232,200,122,0.08); padding: 1px 6px; border-radius: 4px; font-size: 13px; color: #E8DCC8; }
              .footer { text-align: center; padding: 24px 32px; border-top: 1px solid rgba(232,200,122,0.12); }
              .footer p { font-size: 11px; color: rgba(232,220,200,0.3); margin: 0 0 4px; }
              .footer a { color: #E8C87A; text-decoration: underline; font-size: 12px; }
            </style></head>
            <body>
              <div class="email-wrap">
                <div class="header">
                  <h1>Your Life Blueprint</h1>
                  <p>%s</p>
                </div>
                <div class="report-body">%s</div>
                <div class="footer">
                  <p>Generated by PRISM Life Script &middot; Your personal astrology report</p>
                  <p style="margin-top:4px"><a href="http://localhost:3033/generator/final-report?reportId=%s">View online &rarr;</a></p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(name, reportHtml, reportId);
    }

    private String mdToHtml(String md) {
        if (md == null || md.isBlank()) return "";
        Node document = mdParser.parse(md);
        return mdRenderer.render(document);
    }
}
