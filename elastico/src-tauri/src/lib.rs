// Elastiko - Elasticsearch GUI Client
// elastico/src-tauri/src/lib.rs

mod elasticsearch;

use elasticsearch::{
    connect_to_elasticsearch, disconnect_from_elasticsearch, execute_elasticsearch_query,
    get_elasticsearch_cluster_health, get_elasticsearch_indices,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            connect_to_elasticsearch,
            disconnect_from_elasticsearch,
            get_elasticsearch_indices,
            execute_elasticsearch_query,
            get_elasticsearch_cluster_health
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
