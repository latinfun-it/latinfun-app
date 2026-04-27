import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "./api";
import { useAuth } from "./auth";
import { colors, radii, spacing } from "./theme";
import RatingStars from "./RatingStars";

type Kind = "event" | "dj" | "school";

type Review = {
  id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment?: string;
  created_at: string;
};

export default function ReviewsSection({
  kind,
  targetId,
  initialAvg,
  initialCount,
  onChanged,
}: {
  kind: Kind;
  targetId: string;
  initialAvg?: number;
  initialCount?: number;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get<Review[]>(
        `/reviews?target_type=${kind}&target_id=${targetId}`
      );
      setList(r.data || []);
      // se l'utente ha gia' recensito, prefill
      if (user) {
        const mine = (r.data || []).find((x) => x.user_id === user.id);
        if (mine) {
          setMyRating(mine.rating);
          setMyComment(mine.comment || "");
        }
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [kind, targetId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user) {
      router.push("/(auth)/login" as any);
      return;
    }
    if (myRating < 1) {
      const msg = "Tocca le stelle per dare una valutazione (1-5)";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("Valutazione mancante", msg);
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/reviews", {
        target_type: kind,
        target_id: targetId,
        rating: myRating,
        comment: myComment.trim() || null,
      });
      await load();
      onChanged?.();
    } catch {
      const msg = "Errore durante l'invio. Riprova.";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("Errore", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalCount = list.length || initialCount || 0;
  const avg =
    list.length > 0
      ? list.reduce((s, r) => s + r.rating, 0) / list.length
      : initialAvg || 0;

  return (
    <View style={styles.box} testID={`reviews-${kind}-${targetId}`}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Recensioni</Text>
          <View style={styles.summary}>
            <RatingStars value={avg} size={18} />
            <Text style={styles.avgText}>
              {avg > 0 ? avg.toFixed(1) : "—"}
              {totalCount > 0 ? ` · ${totalCount} ${totalCount === 1 ? "recensione" : "recensioni"}` : ""}
            </Text>
          </View>
        </View>
      </View>

      {/* form per scrivere recensione */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.form}>
          <Text style={styles.formLabel}>La tua valutazione</Text>
          <RatingStars
            value={myRating}
            size={28}
            editable
            onChange={setMyRating}
          />
          <TextInput
            testID={`review-comment-${kind}`}
            value={myComment}
            onChangeText={setMyComment}
            placeholder="Scrivi un commento (opzionale)"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            maxLength={600}
            style={styles.input}
          />
          <TouchableOpacity
            testID={`review-submit-${kind}`}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#fff" />
                <Text style={styles.submitText}>Invia recensione</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 16 }} />
      ) : list.length === 0 ? (
        <Text style={styles.empty}>Nessuna recensione, sii il primo!</Text>
      ) : (
        list.map((r) => (
          <View key={r.id} style={styles.reviewItem} testID={`review-item-${r.id}`}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewUser}>{r.user_name}</Text>
              <RatingStars value={r.rating} size={12} />
            </View>
            {r.comment ? <Text style={styles.reviewBody}>{r.comment}</Text> : null}
            <Text style={styles.reviewDate}>
              {new Date(r.created_at).toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { color: "#fff", fontWeight: "900", fontSize: 17 },
  summary: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 },
  avgText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  form: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  formLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    color: "#fff",
    padding: 10,
    minHeight: 60,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row",
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 14, fontSize: 13 },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewUser: { color: "#fff", fontWeight: "700", fontSize: 14 },
  reviewBody: { color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 19 },
  reviewDate: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
});
