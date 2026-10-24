import numpy as np
import pandas as pd

class AHP:
    def __init__(self, criteria_names):
        self.criteria = criteria_names
        self.n = len(criteria_names)
        self.RI_dict = {1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 
                        6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49}
        
    def calculate_weights_and_consistency(self, comparison_matrix):
        matrix = np.array(comparison_matrix, dtype=float)
        col_sums = matrix.sum(axis=0)
        normalized_matrix = matrix / col_sums
        weights = normalized_matrix.mean(axis=1)
        lambda_max = sum(col_sums[i] * weights[i] for i in range(self.n))
        
        ci = (lambda_max - self.n) / (self.n - 1) if self.n > 1 else 0.0
        ri = self.RI_dict.get(self.n, 1.49)
        cr = ci / ri if ri != 0.0 else 0.0
            
        return (col_sums.tolist(), normalized_matrix.tolist(), weights.tolist(), 
                float(lambda_max), float(ci), float(cr))

class SAW:
    def __init__(self, df_decision, criteria_types, weights, norm_type="linear"):
        self.df = df_decision.copy()
        self.types = criteria_types
        self.weights = weights
        self.norm_type = norm_type # linear, minmax, atau sum
        
    def calculate_saw(self):
        df_norm = self.df.copy()
        
        for crit in self.df.columns:
            if crit not in self.types: continue
            
            x = self.df[crit].astype(float)
            max_val = x.max()
            min_val = x.min()
            sum_val = x.sum()
            
            # --- 1. NORMALISASI MIN-MAX (Skala 0-1) ---
            if self.norm_type == "minmax":
                if max_val == min_val:
                    df_norm[crit] = 1.0
                elif self.types[crit] == 'Benefit':
                    df_norm[crit] = (x - min_val) / (max_val - min_val)
                elif self.types[crit] == 'Cost':
                    df_norm[crit] = (max_val - x) / (max_val - min_val)
                    
            # --- 2. NORMALISASI LINEAR KLASIK (Paling umum di buku SPK) ---
            elif self.norm_type == "linear":
                if self.types[crit] == 'Benefit':
                    df_norm[crit] = x / max_val if max_val != 0 else 0
                elif self.types[crit] == 'Cost':
                    # Hindari pembagian dengan nol dengan mengganti 0 menjadi angka sangat kecil sementara jika perlu
                    df_norm[crit] = min_val / x.replace(0, 0.0001)
                    
            # --- 3. NORMALISASI SUM (Proporsi Persentase) ---
            elif self.norm_type == "sum":
                if self.types[crit] == 'Benefit':
                    df_norm[crit] = x / sum_val if sum_val != 0 else 0
                elif self.types[crit] == 'Cost':
                    inv_x = 1.0 / x.replace(0, 0.0001) # Kebalikan untuk cost
                    df_norm[crit] = inv_x / inv_x.sum()

        # Hitung Skor Akhir (Perkalian dengan Bobot)
        scores = []
        for _, row in df_norm.iterrows():
            score = sum(row[crit] * self.weights.get(crit, 0) for crit in self.df.columns if crit in self.weights)
            scores.append(score)
            
        df_final = self.df.copy()
        df_final['Skor Akhir'] = scores
        # Gunakan method='min' agar jika ada skor sama, peringkatnya sama
        df_final['Peringkat'] = df_final['Skor Akhir'].rank(ascending=False, method='min').astype(int) 
        
        return df_final.sort_values(by='Peringkat')