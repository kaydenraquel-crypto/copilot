// API service types
export interface User {
    user_id: number;
    username: string;
    email: string;
    full_name: string | null;
    role: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: User;
}

export interface Equipment {
    manufacturer: string;
    model: string;
}

export interface TroubleshootRequest {
    equipment: Equipment;
    error_code?: string;
    symptom?: string;
}

export interface TroubleshootingStep {
    step: number;
    title: string;
    instruction: string;
    expected_result: string;
    safety_warning?: string;
}

export interface PartToCheck {
    name: string;
    part_number?: string;
    description: string;
    location?: string;
    common_failure_modes?: string[];
}

export interface TroubleshootingData {
    error_definition: string;
    severity: string;
    troubleshooting_steps: TroubleshootingStep[];
    parts_to_check: PartToCheck[];
    common_causes: string[];
    estimated_repair_time_minutes?: number;
    difficulty: string;
    citations: any[];
}

export interface TroubleshootResponse {
    success: boolean;
    data: {
        cache_hit: boolean;
        response_time_ms: number;
        troubleshooting: TroubleshootingData;
        manual_available: boolean;
        manual_id?: number;
    };
}

export interface Manual {
    id: string | number;
    manufacturer?: string;
    brand?: string;
    model: string;
    manual_type?: string;
    equipment_type?: string;
    filename?: string;
    file_path?: string;
    indexing_status?: 'pending' | 'complete' | 'failed' | string;
    indexing_error?: string | null;
    indexed_at?: string | null;
    file_size_mb?: number;
    page_count?: number;
    ocr_quality?: string;
    times_accessed?: number;
    created_at: string;
}

export interface RAGSource {
    page?: number | null;
    section?: string | null;
    excerpt: string;
}

export interface ManualUsed {
    id: string;
    filename: string;
    brand: string;
    model: string;
}

export interface RAGQueryData {
    answer: string;
    sources: RAGSource[];
    manual_used?: ManualUsed | null;
    manual_available: boolean;
}
