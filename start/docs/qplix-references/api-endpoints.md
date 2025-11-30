# Qplix Public API Endpoints

Qplix Public API v1 - Investment management platform

**Base URL:** `https://smd43.qplix.com`

## Authentication

Dual bearer tokens required:
- F5 Token
- Q Token

See [api-reference.md](./api-reference.md) for auth flow details.

---

## Activities

### GET /qapi/v1/activities

**Gets activities**

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| From | query | string (date-time) | No | Exclude all activities earlier to this date |
| Until | query | string (date-time) | No | Exclude all activities prior to this date |
| BusinessObjectType | query | array | No | The type of the activity related business object |
| BusinessObjectId | query | string | No | Only show activities for the specified object id |
| BusinessObjectIds | query | array | No | Multiple business object IDs |
| Labels | query | array | No | Only include activites that have a specific label assigned |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: OK

---

## Benchmarks

### GET /qapi/v1/benchmarks

**Get benchmarks**

Find benchmarks matching the given search criteria.

Operation ID: `Benchmarks`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **500**: Internal Server Error

---

### GET /qapi/v1/benchmarks/{id}

**Get benchmark details**

Operation ID: `Benchmark`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Get the benchmark with the specified id |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

## Classifications

### GET /qapi/v1/classifications/root

**Get the root classification**

Operation ID: `ClassificationRoot`

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/classifications/root/subClassifications

**Get sub classifications of the root classification**

Operation ID: `ClassificationRootSubClassifications`

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/classifications/root/benchmarks

**Get the root classifications benchmarks**

Operation ID: `ClassificationRootBenchmarks`

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### POST /qapi/v1/classifications/root/benchmarks

**Add benchmark to the root classification**

Operation ID: `ClassificationRootBenchmarksAdd`

**Request Body:**

Benchmark to add.

Content-Type: `application/json`

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### DELETE /qapi/v1/classifications/root/benchmarks/{benchmarkId}

**Remove benchmark from the root classification**

Operation ID: `ClassificationRootBenchmarksRemove`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| benchmarkId | path | string | Yes | Id of the benchmark to remove |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/classifications/{id}

**Get classification**

Operation ID: `Classification`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Get the classification with the specified id |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/classifications/{id}/subClassifications

**Get sub classifications**

Operation ID: `SubClassifications`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Get the sub classifications of the classification with the specified id |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/classifications/{id}/benchmarks

**Get the classifications benchmarks**

Operation ID: `ClassificationBenchmarks`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the classification to find benchmarks for |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### POST /qapi/v1/classifications/{id}/benchmarks

**Add benchmark to classification**

Operation ID: `ClassificationBenchmarksAdd`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the classification to add a benchmark for |

**Request Body:**

Benchmark to add.

Content-Type: `application/json`

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### DELETE /qapi/v1/classifications/{id}/benchmarks/{benchmarkId}

**Remove benchmark from classification**

Operation ID: `ClassificationBenchmarksRemove`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the classification to remove a benchmark for |
| benchmarkId | path | string | Yes | Id of the benchmark to remove |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

## Evaluation

### GET /qapi/v1/evaluation/{configId}

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| configId | path | string | Yes | The evaluation configuration |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: OK

---

### GET /qapi/v1/evaluation/{configId}/results/{evaluationId}/client/{clientId}

**Get system evaluation for a client**

Operation ID: `ClientEvaluationInfo`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| configId | path | string | Yes | The evaluation configuration |
| evaluationId | path | string | Yes | The evaluation id. Might also be "last" (for the latest evaluation) or "today" (for an evaluation of the current day) |
| clientId | path | string | Yes | The client id |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/evaluation/{configId}/results/{evaluationId}/client/{clientId}/lines

Operation ID: `ClientEvaluationLines`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| configId | path | string | Yes | Evaluation configuration ID |
| evaluationId | path | string | Yes | Evaluation ID |
| clientId | path | string | Yes | Client ID |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: OK

---

### POST /qapi/v1/evaluation/{configId}/results/lines

**Get the column headers and the first level lines (without children data) for the requested configuration**

Operation ID: `EvaluationLines`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| configId | path | string | Yes | The evaluation configuration to request the data for |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Request Body:**

Request parameters

Content-Type: `application/json`

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### POST /qapi/v1/evaluation/{configId}/recalculate

**Recalculate system evaluation**

For all clients in the system, or if specified for a selection of clients. Returns a job info that can be queried to check the completion of the calculation process. The job will update the evaluation results if any previously calculated results are invalid (e.g., because of new transactions)

Operation ID: `ClientEvaluationRecalculate`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| configId | path | string | Yes | The evaluation configuration id |

**Request Body:**

Content-Type: `application/json`

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/evaluation/preset/{presetId}/legalEntity/{legalEntityId}

**Get legal entity query results**

Get the query results for predefined preset.

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| presetId | path | string | Yes | The id of the preset with the query description |
| legalEntityId | path | string | Yes | The legal entity id the query results are requested for |
| GroupId | query | string | No | Optional group identifier. Determines the context the given legal entity should be evaluated within. Can be obtained through /qapi/v1/legalEntityGroups |
| RespectHide | query | boolean | No | - |
| Interval | query | - | No | Optional default interval for the query, which will affect results for versioned data or metrics which depend on a period |
| StartDate | query | string (date-time) | No | Optional default start date for the query, which will affect results for versioned data or metrics which depend on a period |
| AnalyticStartProviderId | query | string | No | Selects the source of the analytics start date for a perspective legal entity |
| EntryType | query | - | No | Specifies the default entry type for the query. Expected as string or integer. Default is "Unmachted" |
| DueDate | query | string (date-time) | No | Specifies the default date for the query, which will affect results for versioned data or metrics which depend on a due date. Expected format: "YYYY-MM-dd". Default is today |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **500**: Internal Server Error

---

## Investments

### GET /qapi/v1/investments

**Get investments**

Find investments matching the given search criteria.

Operation ID: `Investments`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **500**: Internal Server Error

---

### GET /qapi/v1/investments/{id}

**Get investment details**

Operation ID: `Investment`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Get the investment with the specified id |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/investments/{id}/benchmarks

**Get investment benchmarks**

Operation ID: `InvestmentBenchmarks`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the investment to find benchmarks for |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### POST /qapi/v1/investments/{id}/benchmarks

**Add benchmark**

Operation ID: `InvestmentBenchmarksAdd`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the investment to add a benchmark for |

**Request Body:**

Benchmark to add.

Content-Type: `application/json`

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### DELETE /qapi/v1/investments/{id}/benchmarks/{benchmarkId}

**Remove benchmark**

Operation ID: `InvestmentBenchmarksRemove`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the investment to remove a benchmark for |
| benchmarkId | path | string | Yes | Id of the benchmark to remove |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/investments/{id}/queryResults/{presetId}

**Get investment query results**

Get the query results for predefined preset.

Operation ID: `InvestmentQueryResults`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The investment number the query results are requested for |
| presetId | path | string | Yes | The id of the preset with the query description |
| Interval | query | - | No | Optional default interval for the query |
| StartDate | query | string (date-time) | No | Optional default start date for the query |
| AnalyticStartProviderId | query | string | No | Selects the source of the analytics start date |
| EntryType | query | - | No | Specifies the default entry type for the query |
| DueDate | query | string (date-time) | No | Specifies the default date for the query |

**Responses:**
- **200**: OK

---

### GET /qapi/v1/investments/{id}/documentLinks

**Get investment document links**

Operation ID: `InvestmentDocumentLinks`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Investment ID |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### POST /qapi/v1/investments/{id}/documentLinks

**Set document link for investment**

Operation ID: `InvestmentDocumentLinksPost`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Investment ID |
| DocumentId | query | string | No | Id of the document that should be linked |
| Path | query | string | No | The path of the document |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/investments/{id}/documentTree

**Get document tree**

Get the investment document tree (includes document categories and other nodes)

Operation ID: `InvestmentDocumentTree`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Investment ID |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/investments/{id}/documentTree/{path}

**Get document subtree**

Get the investment document tree (includes document categories and other nodes)

Operation ID: `InvestmentDocumentSubTree`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The id of the investment |
| path | path | string | Yes | Path of the container which subtree should be returned. Path is given by ObjectIds of Nodes seperated by '/'. E.g. '100000000000000000000000/200000000000000000000000' will return all Nodes for 100000000000000000000000/200000000000000000000000 |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/investments/{id}/transactionQueryResults/{presetId}

**Get transaction query results**

Operation ID: `InvestmentsTransactionQueryResultsByPreset`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The investment id the query results are requested for |
| presetId | path | string | Yes | The preset id which should be used for the evaluation |
| ClientGroupId | query | string | No | Optional group id for the given legal entity |
| From | query | string (date-time) | No | Excludes transactions with an due date before the from value |
| EntryType | query | - | No | Specifies the default entry type for the query |
| DueDate | query | string (date-time) | No | Specifies the default date for the query |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

## Jobs

### GET /qapi/v1/jobs/{id}

**Get job details**

Operation ID: `Job`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Get the job with the specified id |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/jobs/{jobId}/paginatedResult

**Get job results**

Get a job result (if delivered by the job).

Operation ID: `PaginatedJobResult`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| jobId | path | string | Yes | Get the job with the specified id |
| skip | query | integer | No | Amount of transactions that will be skipped |
| limit | query | integer | No | The maximum amount of transactions returned |

**Responses:**
- **200**: Ok
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/jobs/{id}/result

**Get job result**

Get a job result (if delivered by the job).

Operation ID: `JobResult`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Get the job with the specified id |

**Responses:**
- **200**: Ok
- **404**: Not found
- **500**: Internal Server Error

---

### POST /qapi/v1/jobs/queue

**Enqueue job**

Operation ID: `JobQueue`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | query | string | No | Id of the existing job to be enqueued |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

## Legal Entities

### GET /qapi/v1/legalEntities

**Get legal entities**

Find legal entities matching the given search criteria.

Operation ID: `LegalEntities`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| Search | query | string | No | A search string e.g. for the legal entity name |
| VirtualEntityIds | query | array | No | Filter for legal entities that are owner for at least one of the set virtual entity Ids |
| Properties | query | array | No | Filter for legal entities that have at least one of the properties with the same value. Each property must be of the form '{"propertyName": "propertyValue"}'. PropertyValue must be a text and will be matched case insensitive |
| IncludeVirtualEntities | query | boolean | No | Also include virtual entities within the search result |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: Ok
- **500**: Internal Server Error

---

### POST /qapi/v1/legalEntities

**Create legal entity**

Operation ID: `LegalEntityCreate`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| templateId | query | string | No | Optional template legal entity to copy settings from. Can be obtained through /qapi/v1/legalEntities |
| copyAccounting | query | boolean | No | If true, accounting information like chart of accounts and accounts will be copied from the template legal entity |
| copyWorkingUsers | query | boolean | No | If true, the working users will be copied from the template legal entity |
| copyCommonProperties | query | boolean | No | If true, the directly set common properties will be copied from the template legal entity |

**Request Body:**

Data of the legal entity to create.

Content-Type: `application/json`

**Responses:**
- **200**: OK
- **202**: Accepted
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### DELETE /qapi/v1/legalEntities

**Delete legal entities**

Deletes multiple legal entities at once.

**Request Body:**

List of legal entity ids.

Content-Type: `application/json`

**Responses:**
- **200**: OK

---

### GET /qapi/v1/legalEntities/{id}

**Get legal entity details**

Operation ID: `LegalEntity`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Get the legal entity with the specified id. Can be obtained through qapi/v1/legalEntities |
| includeInheritedProperties | query | boolean | No | If set to true, the result will include inherited properties |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### PUT /qapi/v1/legalEntities/{id}

**Update legal entity details**

Operation ID: `LegalEntityUpdate`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Update the legal entity with the specified id |

**Request Body:**

Data of the legal entity to update.

Content-Type: `application/json`

**Responses:**
- **200**: OK
- **202**: Accepted
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### DELETE /qapi/v1/legalEntities/{id}

**Delete legal entity**

Operation ID: `LegalEntityDelete`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Delete the legal entity with the specified id |

**Responses:**
- **200**: OK
- **202**: Accepted
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/legalEntities/{id}/benchmarks

**Get legal entity benchmarks**

Operation ID: `EntitiesBenchmarks`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to find benchmarks for |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### POST /qapi/v1/legalEntities/{id}/benchmarks

**Add benchmark to legal entity**

Operation ID: `EntitiesBenchmarksAdd`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to add a benchmark for |

**Request Body:**

Benchmark to add.

Content-Type: `application/json`

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### DELETE /qapi/v1/legalEntities/{id}/benchmarks/{benchmarkId}

**Remove benchmark from legal entity**

Operation ID: `EntitiesBenchmarksRemove`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to remove a benchmark for |
| benchmarkId | path | string | Yes | Id of the benchmark to remove |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/legalEntities/{id}/custodians

**Get legal entity custodians by filter**

Find custodians for a legal entity.

Operation ID: `Custodians`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to find custodians for. Can be obtained through /qapi/v1/legalEntities |
| ExternalId | query | string | No | The External Id of the custodian |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### POST /qapi/v1/legalEntities/{id}/custodians

**Create legal entity custodian**

Operation ID: `CustodianCreate`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to create the custodian for. Can be obtained through /qapi/v1/legalEntities |

**Request Body:**

Data of the custodian to update.

Content-Type: `application/json`

**Responses:**
- **200**: OK
- **202**: Accepted
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/legalEntities/{id}/custodian/{custodianId}

**Get legal entity custodian**

Get custodian for a legal entity.

Operation ID: `Custodian`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to get the custodian for |
| custodianId | path | string | Yes | Id of the custodian |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### PUT /qapi/v1/legalEntities/{id}/custodian/{custodianId}

**Update legal entity custodian**

Operation ID: `CustodianUpdate`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to update the custodian for |
| custodianId | path | string | Yes | Id of the custodian |

**Request Body:**

Data of the custodian to update.

Content-Type: `application/json`

**Responses:**
- **200**: OK
- **202**: Accepted
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### DELETE /qapi/v1/legalEntities/{id}/custodian/{custodianId}

**Delete legal entity custodian**

Operation ID: `CustodianDelete`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to delete the custodian for |
| custodianId | path | string | Yes | Id of the custodian |

**Responses:**
- **200**: OK
- **202**: Accepted
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/legalEntities/{id}/properties

**Get all property histories for legal entity**

Operation ID: `GetMultipleProperties`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to get the property histories for. Can be obtained through qapi/v1/legalEntities |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### PUT /qapi/v1/legalEntities/{id}/properties

**Update multiple properties on legal entity**

Update multiple properties on legal entity. Properties can be specified by either their id or name.

Operation ID: `MultiplePropertiesUpdate`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to update the property histories for |

**Request Body:**

List of property histories.

Content-Type: `application/json`

**Responses:**
- **200**: OK
- **202**: Accepted
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/legalEntities/{id}/properties/{propertyId}

**Get legal entity property history**

Get property history for a legal entity.

Operation ID: `Property`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to get the property history for |
| propertyId | path | string | Yes | Id or name of the property |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### POST /qapi/v1/legalEntities/{id}/properties/{propertyId}

**Create legal entity property history**

Operation ID: `PropertyCreate`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to create the property history for |
| propertyId | path | string | Yes | Id or name of the property |

**Request Body:**

Data for the property history.

Content-Type: `application/json`

**Responses:**
- **200**: OK
- **202**: Accepted
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### PUT /qapi/v1/legalEntities/{id}/properties/{propertyId}

**Update legal entity property history**

Operation ID: `PropertyUpdate`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to update the property history for |
| propertyId | path | string | Yes | Id or name of the property |

**Request Body:**

Data for the property history.

Content-Type: `application/json`

**Responses:**
- **200**: OK
- **202**: Accepted
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### DELETE /qapi/v1/legalEntities/{id}/properties/{propertyId}

**Delete legal entity property history**

Operation ID: `PropertyDelete`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to delete the property history for |
| propertyId | path | string | Yes | Id or name of the property |

**Responses:**
- **200**: OK
- **202**: Accepted
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/legalEntities/{id}/queryResults/{presetId}

**Get legal entity query results**

Get the query results for predefined preset.

Operation ID: `LegalEntityQueryResults`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The legal entity id the query results are requested for. Can be obtained through /qapi/v1/legalEntities |
| presetId | path | string | Yes | The id of the preset with the query description. Can be obtained through /qapi/v1/presets |
| GroupId | query | string | No | Optional group identifier. Determines the context the given legal entity should be evaluated within. Can be obtained through /qapi/v1/legalEntityGroups |
| RespectHide | query | boolean | No | - |
| Interval | query | - | No | Optional default interval for the query |
| StartDate | query | string (date-time) | No | Optional default start date for the query |
| AnalyticStartProviderId | query | string | No | Selects the source of the analytics start date |
| EntryType | query | - | No | Specifies the default entry type for the query |
| DueDate | query | string (date-time) | No | Specifies the default date for the query |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **500**: Internal Server Error

---

### GET /qapi/v1/legalEntities/{id}/transactionQueryResults/{presetId}

**Get transaction query results**

Operation ID: `LegalEntitiesTransactionQueryResultsByPreset`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The legal entity id the query results are requested for |
| presetId | path | string | Yes | The preset id which should be used for the evaluation |
| ClientGroupId | query | string | No | Optional group id for the given legal entity |
| From | query | string (date-time) | No | Excludes transactions with an due date before the from value |
| EntryType | query | - | No | Specifies the default entry type for the query |
| DueDate | query | string (date-time) | No | Specifies the default date for the query |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/legalEntities/{id}/documentLinks

**Get legal entity document links**

Operation ID: `LegalEntityDocumentLinks`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to get the document links for. Can be obtained through qapi/v1/legalEntities |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |
| search | query | string | No | A search string e.g. for the documents name |
| categories | query | array | No | Categories for which to filter the documents |
| sortBy | query | - | No | - |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### POST /qapi/v1/legalEntities/{id}/documentLinks

**Set document link for legal entity**

Operation ID: `LegalEntityDocumentLinksPost`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Legal entity ID |
| DocumentId | query | string | No | Id of the document that should be linked |
| Path | query | string | No | The path of the document |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/legalEntities/{id}/documentTree

**Get document tree**

Get the legal entity document tree (includes document categories and other nodes)

Operation ID: `LegalEntityDocumentTree`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the legal entity to get the document tree for. Can be obtained through qapi/v1/legalEntities |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/legalEntities/{id}/virtualEntities

**Get virtual entities**

Get virtual entities for legal entity.

Operation ID: `VirtualEntities`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Legal Entity id. Can be obtained through /qapi/v1/legalEntities |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: OK

---

### POST /qapi/v1/legalEntities/{id}/virtualEntities

**Create virtual entity**

Operation ID: `VirtualEntityCreate`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Legal entity id for which a virtual entity shall be created. Can be obtained through /qapi/v1/legalEntities |

**Request Body:**

Content-Type: `application/json`

**Responses:**
- **200**: OK

---

## Legal Entity Groups

### GET /qapi/v1/legalEntityGroups

**Get legal entity groups**

Find legal entity groups matching the given search criteria.

Operation ID: `LegalEntityGroups`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| Description | query | string | No | Filter for groups matching the description |
| ContainedEntityIds | query | array | No | Only show groups that contain all of these entities. The available entities can be obtained through /qapi/v1/legalEntities |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **500**: Internal Server Error

---

### POST /qapi/v1/legalEntityGroups

**Create legal entity group**

Operation ID: `CreateLegalEntityGroup`

**Request Body:**

New group data.

Content-Type: `application/json`

**Responses:**
- **200**: OK

---

### GET /qapi/v1/legalEntityGroups/{id}

**Get legal entity group**

Operation ID: `LegalEntityGroup`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Get the group with the specified id. Can be obtained through /qapi/v1/legalEntityGroups |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### PUT /qapi/v1/legalEntityGroups/{id}

**Update legal entity group**

Operation ID: `UpdateLegalEntityGroup`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the group |

**Request Body:**

New group data.

Content-Type: `application/json`

**Responses:**
- **200**: OK

---

### DELETE /qapi/v1/legalEntityGroups/{id}

**Delete legal entity group**

Operation ID: `DeleteLegalEntityGroup`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the group |

**Responses:**
- **200**: OK

---

## Presets

### GET /qapi/v1/presets

**Get presets**

Find presets matching the given search criteria.

Operation ID: `Presets`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **500**: Internal Server Error

---

### GET /qapi/v1/presets/{id}

**Get preset details**

Operation ID: `Preset`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Get the preset with the specified id |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

## Securities

### GET /qapi/v1/securities

**Get securities**

Find securities matching the given search criteria.

Operation ID: `Securities`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| Search | query | string | No | A search string e.g. for the security name |
| DueDate | query | string (date-time) | No | Date the security is valid on |
| Tags | query | array | No | Tags which need to be set on the security |
| ClassificationIds | query | array | No | Classifications to use for the search. Can be obtained via /qapi/v1/classifications/root and /qapi/v1/classifications/root/subclassifications |
| InvestmentState | query | - | No | Represents an investment state for a security |
| ExternalId | query | string | No | External Id of the security |
| IncludeDetails | query | boolean | No | If set to true, all details of the securities will be returned |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |
| includeInheritedProperties | query | boolean | No | If set to true, the result will include inherited properties. Ignored, if includeDetails is not set to true |

**Responses:**
- **200**: Ok
- **400**: Bad request

---

### GET /qapi/v1/securities/{id}

**Get security details**

Operation ID: `Security`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Get the security with the specified id. The id can be obtained through /qapi/v1/securities |
| includeInheritedProperties | query | boolean | No | If set to true, the result will include inherited properties |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found

---

### GET /qapi/v1/securities/{id}/benchmarks

**Get benchmarks**

Get the securities benchmarks

Operation ID: `SecurityBenchmarks`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the security to find benchmarks for |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### POST /qapi/v1/securities/{id}/benchmarks

**Add benchmark**

Add benchmark to security

Operation ID: `SecurityBenchmarksAdd`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the security to add a benchmark for |

**Request Body:**

Benchmark to add.

Content-Type: `application/json`

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### DELETE /qapi/v1/securities/{id}/benchmarks/{benchmarkId}

**Remove benchmark**

Remove benchmark from security

Operation ID: `SecurityBenchmarksRemove`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | Id of the security to remove a benchmark for |
| benchmarkId | path | string | Yes | Id of the benchmark to remove |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **403**: Forbidden
- **404**: Not found
- **500**: Internal Server Error

---

### GET /qapi/v1/securities/{id}/investments

**Get investments**

Operation ID: `SecurityInvestments`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The security id the investments are requested for |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found

---

### GET /qapi/v1/securities/{id}/images

**Get images**

Operation ID: `SecurityImages`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The security id the images are requested for |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found

---

### POST /qapi/v1/securities/{id}/images

**Upload images**

Uploads images to the security.

Operation ID: `SecurityImageUpload`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The id of the security |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found

---

### GET /qapi/v1/securities/{id}/images/{imageId}

**Get image**

Returns a rescaled image of the security. Only one parameter of width, height or maxSize should be use to ensure correct image ratio.

Operation ID: `SecurityImage`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The id of the security |
| imageId | path | string | Yes | The id of the image to return |
| width | query | integer | No | Specifies the pixel width of the requested image |
| height | query | integer | No | Specifies the pixel height of the requested image |
| maxSize | query | integer | No | Defines the maximum pixel size of either the widh or the height of the requested image |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found

---

### GET /qapi/v1/securities/{id}/logo

**Get logo**

Returns the default logo of the security.

Operation ID: `SecurityLogo`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The id of the security |
| width | query | integer | No | Specifies the pixel width of the requested image |
| height | query | integer | No | Specifies the pixel height of the requested image |
| maxSize | query | integer | No | Defines the maximum pixel size of either the widh or the height of the requested image |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found

---

### GET /qapi/v1/securities/{id}/documentLinks

**Get document links**

Operation ID: `SecurityDocumentLinks`

**Parameters:**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The id of the security |
| Skip | query | integer | No | Number of results to skip |
| Limit | query | integer | No | Number of results to return |
| legalEntityIds | query | array | No | - |

**Responses:**
- **200**: Ok
- **400**: Bad request
- **404**: Not found
- **500**: Internal Server Error

---

## Additional Endpoints

Note: The API contains additional endpoints for:
- Virtual entities (nested under legal entities)
- Custodian management (with benchmarks and bank accounts)
- Document trees and subtrees
- Transaction queries
- Property histories
- Analytics start providers
- Filters

Refer to the full HTML documentation for complete details on all nested endpoints and complex relationships.
