import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { getFamily, listFamilyMembers, removeFamilyMember } from "@/api/families";
import { AppScreen } from "@/components/AppScreen";
import { FamilyMember } from "@/features/families/types";
import { useAppTheme } from "@/theme/ThemeProvider";

function parseFamilyId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function FamilyMembersScreen() {
  const { id } = useLocalSearchParams();
  const familyId = parseFamilyId(id);
  const { theme } = useAppTheme();
  const queryClient = useQueryClient();
  const familyQuery = useQuery({ queryKey: ["families", familyId], queryFn: () => getFamily(familyId ?? 0), enabled: familyId !== null });
  const membersQuery = useQuery({ queryKey: ["families", familyId, "members"], queryFn: () => listFamilyMembers(familyId ?? 0), enabled: familyId !== null });
  const removeMutation = useMutation({
    mutationFn: (userId: number) => removeFamilyMember(familyId ?? 0, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["families"] });
      await queryClient.invalidateQueries({ queryKey: ["families", familyId] });
      await queryClient.invalidateQueries({ queryKey: ["families", familyId, "members"] });
    }
  });

  if (familyId === null) {
    return <AppScreen><Text style={{ color: theme.textColor }}>家庭 ID 无效。</Text></AppScreen>;
  }
  if (familyQuery.isLoading || membersQuery.isLoading) {
    return <AppScreen><ActivityIndicator /></AppScreen>;
  }
  if (familyQuery.isError || membersQuery.isError || !familyQuery.data) {
    return <AppScreen><Text style={{ color: theme.textColor }}>成员加载失败。</Text></AppScreen>;
  }

  const isAdmin = familyQuery.data.role === "admin";

  return (
    <AppScreen>
      <Text style={[styles.title, { color: theme.textColor }]}>家庭成员</Text>
      {membersQuery.data?.map((member: FamilyMember) => {
        const canRemove = isAdmin && member.role !== "admin";
        return (
          <View key={member.id} style={[styles.card, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: theme.textColor }]}>{member.nickname}</Text>
              <Text style={{ color: theme.mutedTextColor }}>{member.role === "admin" ? "管理员" : "成员"}</Text>
            </View>
            {canRemove ? (
              <Pressable disabled={removeMutation.isPending} onPress={() => removeMutation.mutate(member.user_id)} style={[styles.dangerButton, { borderColor: "#DC2626" }]}>
                <Text style={{ color: "#DC2626" }}>移除</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {removeMutation.isError ? <Text style={{ color: "#DC2626" }}>移除成员失败。</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  card: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 16 },
  memberInfo: { gap: 4 },
  memberName: { fontSize: 18, fontWeight: "800" },
  dangerButton: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 }
});
