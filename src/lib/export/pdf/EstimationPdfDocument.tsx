import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { ClientSummary } from "@/lib/summary/generate-client-summary";
import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";

export type EstimationPdfDocumentProps = {
  estimationId: string;
  createdAt: string;
  input: EstimationInput;
  result: EstimationResult;
  clientSummary: ClientSummary;
};

const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 56,
    paddingLeft: 56,
    paddingRight: 56,
    color: "#111111",
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  meta: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    borderBottomStyle: "solid",
    marginTop: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#999999",
    marginBottom: 8,
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    color: "#666666",
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
    borderBottomStyle: "solid",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eeeeee",
    borderBottomStyle: "solid",
  },
  colName: { flex: 3 },
  colComplexity: { flex: 2 },
  colPoints: { flex: 1, textAlign: "right" },
  rangeBlock: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    padding: 12,
  },
  rangeBlockTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#999999",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  noteItem: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 3,
  },
  summaryText: {
    fontSize: 9,
    color: "#333333",
    lineHeight: 1.6,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    textAlign: "center",
    fontSize: 8,
    color: "#bbbbbb",
  },
});

export function EstimationPdfDocument({
  estimationId,
  createdAt,
  input,
  result,
  clientSummary,
}: EstimationPdfDocumentProps) {
  const date = new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.title}>Jitwise Estimation Proposal</Text>
        <Text style={styles.meta}>Created {date}</Text>
        <Text style={styles.meta}>ID: {estimationId}</Text>
        <Text style={styles.meta}>Hourly rate: ${fmt(input.hourlyRate)}</Text>

        <View style={styles.divider} />

        {/* Scope table */}
        <Text style={styles.sectionLabel}>SCOPE</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.colName, { fontSize: 8, color: "#999999", fontFamily: "Helvetica-Bold" }]}>MODULE</Text>
          <Text style={[styles.colComplexity, { fontSize: 8, color: "#999999", fontFamily: "Helvetica-Bold" }]}>COMPLEXITY</Text>
          <Text style={[styles.colPoints, { fontSize: 8, color: "#999999", fontFamily: "Helvetica-Bold" }]}>PTS</Text>
        </View>
        {clientSummary.scope.map((item) => (
          <View key={item.moduleId} style={styles.tableRow}>
            <Text style={styles.colName}>{item.name}</Text>
            <Text style={styles.colComplexity}>{item.complexity}</Text>
            <Text style={styles.colPoints}>{item.points}</Text>
          </View>
        ))}
        <View style={styles.row}>
          <Text style={{ marginTop: 6, color: "#666666" }}>Base scope points</Text>
          <Text style={[styles.bold, { marginTop: 6 }]}>{clientSummary.baseScopePoints} pts</Text>
        </View>

        <View style={styles.divider} />

        {/* Ranges */}
        <Text style={styles.sectionLabel}>ESTIMATES</Text>
        <View style={{ flexDirection: "row" }}>
          <View style={[styles.rangeBlock, { marginRight: 8 }]}>
            <Text style={styles.rangeBlockTitle}>HOURS</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Min</Text>
              <Text style={styles.bold}>{fmt(result.hoursRange.min)} hrs</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Probable</Text>
              <Text style={styles.bold}>{fmt(result.hoursRange.probable)} hrs</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Max</Text>
              <Text style={styles.bold}>{fmt(result.hoursRange.max)} hrs</Text>
            </View>
          </View>
          <View style={styles.rangeBlock}>
            <Text style={styles.rangeBlockTitle}>PRICING</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Min</Text>
              <Text style={styles.bold}>${fmt(result.pricingRange.min)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Probable</Text>
              <Text style={styles.bold}>${fmt(result.pricingRange.probable)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Max</Text>
              <Text style={styles.bold}>${fmt(result.pricingRange.max)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Multipliers */}
        <Text style={styles.sectionLabel}>RISK & URGENCY</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Risk</Text>
          <Text>{clientSummary.risk.level} ({result.riskMultiplier}x) — {clientSummary.risk.note}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Urgency</Text>
          <Text>{clientSummary.urgency.level} ({result.urgencyMultiplier}x) — {clientSummary.urgency.note}</Text>
        </View>

        <View style={styles.divider} />

        {/* Notes */}
        <Text style={styles.sectionLabel}>NOTES</Text>
        {clientSummary.notes.map((note, i) => (
          <Text key={i} style={styles.noteItem}>
            • {note}
          </Text>
        ))}

        <View style={styles.divider} />

        {/* Summary */}
        <Text style={styles.sectionLabel}>CLIENT SUMMARY</Text>
        <Text style={styles.summaryText}>{clientSummary.summaryText}</Text>

        {/* Advisor insights — only rendered when available */}
        {clientSummary.advisorInsights && (
          clientSummary.advisorInsights.risks.length > 0 ||
          clientSummary.advisorInsights.questions.length > 0
        ) && (
          <>
            <View style={styles.divider} />
            {clientSummary.advisorInsights.risks.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>RISK FACTORS & COMPLEXITY</Text>
                {clientSummary.advisorInsights.risks.map((risk, i) => (
                  <Text key={i} style={styles.noteItem}>• {risk}</Text>
                ))}
                <View style={{ marginBottom: 10 }} />
              </>
            )}
            {clientSummary.advisorInsights.questions.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>OPEN QUESTIONS</Text>
                {clientSummary.advisorInsights.questions.map((q, i) => (
                  <Text key={i} style={styles.noteItem}>? {q}</Text>
                ))}
              </>
            )}
          </>
        )}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Generated by Jitwise
        </Text>
      </Page>
    </Document>
  );
}
