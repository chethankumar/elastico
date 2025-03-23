// Elastiko - Elasticsearch GUI Client
// elastico/src-tauri/src/elasticsearch.rs

use serde::{Deserialize, Serialize};
use reqwest::Client as ReqwestClient;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use tauri::command;
use std::collections::HashMap;
use parking_lot::Mutex;
use once_cell::sync::Lazy;
use base64::{Engine as _, engine::general_purpose::STANDARD};

// Shared client state
static CONNECTION: Lazy<Mutex<Option<ElasticsearchConnection>>> = Lazy::new(|| Mutex::new(None));
// Initialize the client with accept_invalid_certs set to true
static CLIENT: Lazy<Mutex<Option<ReqwestClient>>> = Lazy::new(|| {
    // Create a client builder that accepts invalid certificates
    let client_builder = reqwest::ClientBuilder::new()
        .danger_accept_invalid_certs(true)
        .timeout(std::time::Duration::from_secs(30)); // Also add a reasonable timeout
    
    match client_builder.build() {
        Ok(client) => Mutex::new(Some(client)),
        Err(_) => Mutex::new(Some(ReqwestClient::new())), // Fallback to default if builder fails
    }
});

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElasticsearchConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub ssl: Option<bool>,
    pub api_key: Option<String>,
    pub auth_type: String, // "none", "basic", or "apiKey"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElasticsearchIndex {
    pub name: String,
    pub health: String,
    pub status: String,
    pub docs_count: u64,
    pub docs_deleted: u64,
    pub primary_shards: u32,
    pub replica_shards: u32,
    pub storage_size: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub hits: Vec<serde_json::Value>,
    pub total: u64,
    pub took: u64,
    pub timed_out: bool,
    pub shards: QueryShards,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryShards {
    pub total: u32,
    pub successful: u32,
    pub failed: u32,
    pub skipped: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterHealth {
    pub cluster_name: String,
    pub status: String,
    pub number_of_nodes: u32,
    pub number_of_data_nodes: u32,
    pub active_primary_shards: u32,
    pub active_shards: u32,
    pub relocating_shards: u32,
    pub initializing_shards: u32,
    pub unassigned_shards: u32,
    pub pending_tasks: u32,
}

fn get_base_url(conn: &ElasticsearchConnection) -> String {
    let protocol = if conn.ssl.unwrap_or(false) { "https" } else { "http" };
    format!("{}://{}:{}", protocol, conn.host, conn.port)
}

fn create_auth_headers(conn: &ElasticsearchConnection) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    
    if conn.auth_type == "basic" {
        if let (Some(username), Some(password)) = (&conn.username, &conn.password) {
            let auth = format!("{}:{}", username, password);
            let encoded = STANDARD.encode(auth);
            headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Basic {}", encoded))
                .map_err(|e| e.to_string())?);
        }
    } else if conn.auth_type == "apiKey" {
        if let Some(api_key) = &conn.api_key {
            headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("ApiKey {}", api_key))
                .map_err(|e| e.to_string())?);
        }
    }
    
    Ok(headers)
}

#[command]
pub async fn connect_to_elasticsearch(connection: ElasticsearchConnection) -> Result<serde_json::Value, String> {
    // Get a client from our Mutex, then drop the guard immediately
    let client = {
        let client_guard = CLIENT.lock();
        client_guard.as_ref().ok_or("HTTP client not available")?.clone()
    };
    
    let url = format!("{}", get_base_url(&connection));
    
    // Try to ping the Elasticsearch server
    let mut request = client.get(&format!("{}/_cluster/health", url));
    
    // Add authentication if needed
    if connection.auth_type == "basic" {
        if let (Some(username), Some(password)) = (&connection.username, &connection.password) {
            request = request.basic_auth(username, Some(password));
        }
    } else if connection.auth_type == "apiKey" {
        if let Some(api_key) = &connection.api_key {
            request = request.header(AUTHORIZATION, format!("ApiKey {}", api_key));
        }
    }
    
    // Send the request
    let response = match request.send().await {
        Ok(resp) => resp,
        Err(e) => {
            // Provide a more user-friendly error message
            let error_msg = format!("Error connecting to Elasticsearch: {}. This may be due to an invalid SSL certificate, network issue, or incorrect connection details.", e);
            return Err(error_msg);
        }
    };
    
    // Check if the connection was successful
    if response.status().is_success() {
        // Get the response body to include in our result
        let health_data: serde_json::Value = match response.json().await {
            Ok(data) => data,
            Err(e) => {
                return Err(format!("Connected to Elasticsearch but couldn't parse health data: {}", e));
            }
        };
        
        // Create a successful response with connection details
        let cluster_name = health_data["cluster_name"].as_str().unwrap_or("unknown");
        let cluster_status = health_data["status"].as_str().unwrap_or("unknown");
        
        println!("Successfully connected to Elasticsearch cluster: {}, status: {}", cluster_name, cluster_status);
        
        // Save the connection
        let mut conn = CONNECTION.lock();
        *conn = Some(connection.clone());
        
        // Return a rich response with connection details
        let result = serde_json::json!({
            "connected": true,
            "cluster_name": cluster_name,
            "status": cluster_status,
            "connection": connection,
            "health": health_data
        });
        
        Ok(result)
    } else {
        let status = response.status();
        let error_text = match response.text().await {
            Ok(text) => text,
            Err(_) => "Unable to read error response".to_string()
        };
        
        Err(format!("Elasticsearch server returned an error - Status: {}, Response: {}", status, error_text))
    }
}

#[command]
pub fn disconnect_from_elasticsearch() -> Result<bool, String> {
    let mut conn = CONNECTION.lock();
    *conn = None;
    Ok(true)
}

#[command]
pub async fn get_elasticsearch_indices() -> Result<Vec<ElasticsearchIndex>, String> {
    // Get connection and client info, then drop the guards
    let (conn, client) = {
        let conn_guard = CONNECTION.lock();
        let client_guard = CLIENT.lock();
        
        let conn = conn_guard.as_ref().ok_or("Not connected to Elasticsearch")?.clone();
        let client = client_guard.as_ref().ok_or("HTTP client not available")?.clone();
        
        (conn, client)
    };
    
    let url = format!("{}/_cat/indices?format=json&v=true", get_base_url(&conn));
    let headers = create_auth_headers(&conn)?;
    
    // Send the request
    let response = client.get(&url).headers(headers).send().await.map_err(|e| e.to_string())?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to get indices: {}", response.status()));
    }
    
    let indices_data: Vec<HashMap<String, String>> = response.json().await.map_err(|e| e.to_string())?;
    
    let indices = indices_data.into_iter().map(|index| {
        ElasticsearchIndex {
            name: index.get("index").cloned().unwrap_or_default(),
            health: index.get("health").cloned().unwrap_or_default(),
            status: index.get("status").cloned().unwrap_or_default(),
            docs_count: index.get("docs.count").and_then(|v| v.parse().ok()).unwrap_or(0),
            docs_deleted: index.get("docs.deleted").and_then(|v| v.parse().ok()).unwrap_or(0),
            primary_shards: index.get("pri").and_then(|v| v.parse().ok()).unwrap_or(0),
            replica_shards: index.get("rep").and_then(|v| v.parse().ok()).unwrap_or(0),
            storage_size: index.get("store.size").cloned().unwrap_or_default(),
        }
    }).collect();
    
    Ok(indices)
}

#[command]
pub async fn execute_elasticsearch_query(index: String, query: String) -> Result<QueryResult, String> {
    // Get connection and client info, then drop the guards
    let (conn, client) = {
        let conn_guard = CONNECTION.lock();
        let client_guard = CLIENT.lock();
        
        let conn = conn_guard.as_ref().ok_or("Not connected to Elasticsearch")?.clone();
        let client = client_guard.as_ref().ok_or("HTTP client not available")?.clone();
        
        (conn, client)
    };
    
    let url = format!("{}/{}/_search", get_base_url(&conn), index);
    let headers = create_auth_headers(&conn)?;
    
    // Parse and validate the query
    let query_json: serde_json::Value = serde_json::from_str(&query).map_err(|e| e.to_string())?;
    
    // Send the request
    let response = client.post(&url)
        .headers(headers)
        .json(&query_json)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to execute query: {}", response.status()));
    }
    
    let response_body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    // Extract values from the response
    let hits = response_body["hits"]["hits"].as_array()
        .ok_or("Invalid response format")?.clone();
    
    let total = if response_body["hits"]["total"].is_object() {
        response_body["hits"]["total"]["value"].as_u64().unwrap_or(0)
    } else {
        response_body["hits"]["total"].as_u64().unwrap_or(0)
    };
    
    let took = response_body["took"].as_u64().unwrap_or(0);
    let timed_out = response_body["timed_out"].as_bool().unwrap_or(false);
    
    let shards = QueryShards {
        total: response_body["_shards"]["total"].as_u64().unwrap_or(0) as u32,
        successful: response_body["_shards"]["successful"].as_u64().unwrap_or(0) as u32,
        failed: response_body["_shards"]["failed"].as_u64().unwrap_or(0) as u32,
        skipped: response_body["_shards"]["skipped"].as_u64().unwrap_or(0) as u32,
    };
    
    Ok(QueryResult {
        hits,
        total,
        took,
        timed_out,
        shards,
    })
}

#[command]
pub async fn get_elasticsearch_cluster_health() -> Result<ClusterHealth, String> {
    // Get connection and client info, then drop the guards
    let (conn, client) = {
        let conn_guard = CONNECTION.lock();
        let client_guard = CLIENT.lock();
        
        let conn = conn_guard.as_ref().ok_or("Not connected to Elasticsearch")?.clone();
        let client = client_guard.as_ref().ok_or("HTTP client not available")?.clone();
        
        (conn, client)
    };
    
    let url = format!("{}/_cluster/health", get_base_url(&conn));
    let headers = create_auth_headers(&conn)?;
    
    // Send the request
    let response = client.get(&url).headers(headers).send().await.map_err(|e| e.to_string())?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to get cluster health: {}", response.status()));
    }
    
    let health_data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    Ok(ClusterHealth {
        cluster_name: health_data["cluster_name"].as_str().unwrap_or("").to_string(),
        status: health_data["status"].as_str().unwrap_or("").to_string(),
        number_of_nodes: health_data["number_of_nodes"].as_u64().unwrap_or(0) as u32,
        number_of_data_nodes: health_data["number_of_data_nodes"].as_u64().unwrap_or(0) as u32,
        active_primary_shards: health_data["active_primary_shards"].as_u64().unwrap_or(0) as u32,
        active_shards: health_data["active_shards"].as_u64().unwrap_or(0) as u32,
        relocating_shards: health_data["relocating_shards"].as_u64().unwrap_or(0) as u32,
        initializing_shards: health_data["initializing_shards"].as_u64().unwrap_or(0) as u32,
        unassigned_shards: health_data["unassigned_shards"].as_u64().unwrap_or(0) as u32,
        pending_tasks: health_data["number_of_pending_tasks"].as_u64().unwrap_or(0) as u32,
    })
} 