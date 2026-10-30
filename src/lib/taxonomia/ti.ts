/**
 * Taxonomia de competências de TI (e disciplinas gerais cobradas nas provas de TI).
 * Classificação 100% determinística: dicionário de termos normalizados (sem acento, minúsculos).
 * Para ampliar a cobertura, acrescente termos aqui — `npm run taxonomia:sugerir` lista os que faltam.
 */

export type NoCompetencia = { id: string; nome: string; grupo: string; termos: string[] };

export const GRUPOS: Record<string, string> = {
  bd: "Banco de Dados",
  redes: "Redes de Computadores",
  seg: "Segurança da Informação",
  es: "Engenharia de Software",
  prog: "Programação e Estruturas de Dados",
  so: "Sistemas Operacionais",
  gov: "Governança, Gestão e Contratações de TI",
  nuvem: "Nuvem, DevOps e Arquitetura",
  infra: "Infraestrutura e Hardware",
  dados: "Ciência de Dados e IA",
  si: "Sistemas de Informação",
  geral: "Conhecimentos Gerais",
};

const no = (id: string, nome: string, termos: string[]): NoCompetencia => ({ id, nome, grupo: id.split(".")[1] ?? id, termos });

export const COMPETENCIAS: NoCompetencia[] = [
  // ---- Banco de dados
  no("ti.bd.sql", "SQL", ["sql", "select", "join", "group by", "order by", "having", "subconsulta", "clausula where", "ddl", "dml", "dcl", "create table", "insert into", "stored procedure", "trigger", "pl/sql", "plpgsql", "pl/pgsql", "view", "funcao de agregacao", "union"]),
  no("ti.bd.modelagem", "Modelagem e normalização", ["modelo relacional", "normalizacao", "forma normal", "entidade-relacionamento", "entidade relacionamento", "diagrama entidade", "modelo conceitual", "modelo logico", "chave primaria", "chave estrangeira", "chave candidata", "dependencia funcional", "algebra relacional", "cardinalidade", "integridade referencial", "modelagem de dados", "mer"]),
  no("ti.bd.transacoes", "Transações e concorrência", ["acid", "transacao", "transacoes", "controle de concorrencia", "bloqueio", "deadlock", "isolamento", "commit", "rollback", "serializacao", "two-phase", "nivel de isolamento", "log de transacoes"]),
  no("ti.bd.nosql", "NoSQL", ["nosql", "mongodb", "redis", "cassandra", "chave-valor", "orientado a documentos", "banco de dados de grafos", "neo4j", "teorema cap", "elasticsearch", "banco de dados orientado a colunas"]),
  no("ti.bd.dw", "Data Warehouse e BI", ["data warehouse", "data mart", "olap", "etl", "business intelligence", "modelo dimensional", "esquema estrela", "star schema", "mineracao de dados", "big data", "data lake", "hadoop", "spark", "kdd", "dimensao", "tabela fato", "cubo"]),
  no("ti.bd.admin", "Administração de SGBD", ["sgbd", "postgresql", "mysql", "mariadb", "oracle database", "sql server", "indice", "indices", "otimizacao de consultas", "plano de execucao", "particionamento", "replicacao", "backup de banco", "banco de dados", "bancos de dados"]),
  // ---- Redes
  no("ti.redes.modelos", "Modelos e arquiteturas de rede", ["modelo osi", "tcp/ip", "camada de enlace", "camada de transporte", "camada de rede", "camada de aplicacao", "camada fisica", "encapsulamento", "pdu", "modelo de referencia"]),
  no("ti.redes.protocolos", "Protocolos e serviços", ["tcp", "udp", "icmp", "arp", "dhcp", "dns", "http", "https", "ftp", "smtp", "pop3", "imap", "snmp", "ldap", "ssh", "telnet", "nat", "vlan", "ntp", "syslog", "radius", "websocket"]),
  no("ti.redes.roteamento", "Roteamento e endereçamento", ["roteamento", "ospf", "bgp", "rip", "eigrp", "roteador", "switch", "sub-rede", "subrede", "cidr", "ipv4", "ipv6", "mascara de rede", "endereco ip", "vlsm", "spanning tree", "stp", "trunk", "gateway"]),
  no("ti.redes.semfio", "Redes sem fio", ["wi-fi", "wifi", "802.11", "wlan", "access point", "ponto de acesso", "bluetooth", "wpa", "wpa2", "ssid", "rede sem fio", "wimax", "5g", "lte"]),
  no("ti.redes.meios", "Meios, cabeamento e topologias", ["fibra optica", "par trancado", "cabo coaxial", "cabeamento estruturado", "ethernet", "topologia", "utp", "rj-45", "lan", "wan", "man", "atenuacao", "multiplexacao", "modulacao", "switch ethernet"]),
  no("ti.redes.voz", "Voz, QoS e WAN", ["voip", "sip", "qos", "mpls", "sd-wan", "sdn", "h.323", "telefonia ip", "videoconferencia", "vpn site-to-site"]),
  // ---- Segurança
  no("ti.seg.cripto", "Criptografia", ["criptografia", "aes", "rsa", "chave simetrica", "chave assimetrica", "chave publica", "chave privada", "funcao hash", "sha-256", "sha-1", "md5", "assinatura digital", "certificado digital", "pki", "icp-brasil", "tls", "ssl", "diffie-hellman", "cifra", "criptografico", "criptografica", "hmac", "blockchain"]),
  no("ti.seg.ameacas", "Ameaças e controles técnicos", ["firewall", "ids", "ips", "vpn", "waf", "antivirus", "malware", "ransomware", "phishing", "ddos", "negacao de servico", "injecao de sql", "sql injection", "xss", "csrf", "vulnerabilidade", "pentest", "teste de invasao", "owasp", "engenharia social", "trojan", "worm", "botnet", "spyware", "ataque", "honeypot", "siem", "soc"]),
  no("ti.seg.gestao", "Gestão de segurança e continuidade", ["iso 27001", "iso 27002", "iso 27005", "iso/iec 27001", "iso/iec 27002", "politica de seguranca", "plano de continuidade", "continuidade de negocios", "gestao de riscos", "sgsi", "confidencialidade", "integridade e disponibilidade", "plano de recuperacao", "gestao de incidentes de seguranca", "etir", "classificacao da informacao", "norma de seguranca", "auditoria de sistemas", "iso 22301", "iso 31000"]),
  no("ti.seg.acesso", "Controle de acesso e identidade", ["controle de acesso", "autenticacao", "autorizacao", "oauth", "oauth2", "openid", "saml", "sso", "single sign", "mfa", "multifator", "keycloak", "jwt", "kerberos", "rbac", "biometria", "token de acesso", "access token"]),
  no("ti.seg.leis", "Legislação de TI e proteção de dados", ["lgpd", "lei geral de protecao de dados", "13.709", "marco civil da internet", "12.965", "12.737", "lei de acesso a informacao", "12.527", "decreto 10.222", "politica nacional de seguranca da informacao", "crimes ciberneticos", "dados pessoais", "controlador", "encarregado", "anpd"]),
  // ---- Engenharia de software
  no("ti.es.requisitos", "Requisitos e análise", ["requisito funcional", "requisitos nao funcionais", "engenharia de requisitos", "caso de uso", "casos de uso", "historia de usuario", "levantamento de requisitos", "rastreabilidade", "especificacao de requisitos", "analise de sistemas", "prototipacao"]),
  no("ti.es.modelagem", "UML e padrões de projeto", ["uml", "diagrama de classes", "diagrama de sequencia", "diagrama de atividades", "diagrama de casos de uso", "padroes de projeto", "design pattern", "singleton", "factory", "observer", "strategy", "mvc", "solid", "gof", "acoplamento", "coesao de modulos", "arquitetura em camadas", "ddd", "domain-driven"]),
  no("ti.es.processos", "Processos e métodos ágeis", ["scrum", "kanban", "extreme programming", "metodo agil", "metodos ageis", "manifesto agil", "rup", "cascata", "modelo em espiral", "cmmi", "mps.br", "mps-br", "sprint", "product owner", "backlog", "lean", "safe", "ciclo de vida de software", "processo de software", "iso 12207"]),
  no("ti.es.testes", "Testes e qualidade", ["teste de software", "teste unitario", "testes unitarios", "tdd", "bdd", "teste de integracao", "teste de regressao", "junit", "selenium", "cobertura de teste", "caixa preta", "caixa branca", "teste de aceitacao", "qualidade de software", "iso 25010", "refatoracao", "code review", "teste de carga", "teste de desempenho"]),
  no("ti.es.metricas", "Métricas e gestão de software", ["ponto de funcao", "pontos de funcao", "metrica de software", "estimativa de software", "cocomo", "manutencao de software", "gerencia de configuracao", "versionamento", "git", "subversion", "branch", "merge", "linha de base"]),
  // ---- Programação
  no("ti.prog.poo", "Orientação a objetos", ["orientacao a objetos", "orientado a objetos", "heranca", "polimorfismo", "encapsulamento", "classe abstrata", "sobrecarga", "sobrescrita", "construtor", "metodo estatico", "instanciar", "abstracao"]),
  no("ti.prog.linguagens", "Linguagens e frameworks", ["java", "python", "javascript", "typescript", "c#", "c++", "php", "kotlin", "golang", "ruby", "scala", "perl", ".net", "spring", "hibernate", "jpa", "django", "flask", "node.js", "nodejs", "react", "angular", "vue", "html", "css", "jsp", "servlet", "jsf", "maven", "gradle", "composer", "npm", "laravel", "jquery", "dom", "ecmascript", "annotation", "@repository", "@service"]),
  no("ti.prog.algoritmos", "Algoritmos e estruturas de dados", ["algoritmo", "algoritmos", "complexidade", "notacao big", "ordenacao", "busca binaria", "recursao", "recursivo", "pilha", "fila", "lista encadeada", "arvore binaria", "arvore avl", "grafo", "grafos", "tabela hash", "estrutura de dados", "estruturas de dados", "heap", "quicksort", "mergesort", "bubble sort", "programacao dinamica", "vetor", "matriz", "ponteiro", "compilador", "analise lexica", "automato"]),
  no("ti.prog.web", "Desenvolvimento web e APIs", ["rest", "restful", "api", "soap", "json", "xml", "web service", "ajax", "xpath", "xslt", "wsdl", "graphql", "openapi", "swagger", "pwa", "responsivo", "acessibilidade web", "wcag", "emag", "javascript assincrono", "cookie", "sessao web"]),
  // ---- Sistemas operacionais
  no("ti.so.linux", "Linux e Unix", ["linux", "shell script", "bash", "chmod", "grep", "systemd", "kernel", "ubuntu", "centos", "red hat", "debian", "unix", "sudo", "cron", "iptables", "ext4", "/etc/", "comando ls", "permissoes de arquivo"]),
  no("ti.so.windows", "Windows e Active Directory", ["windows", "active directory", "powershell", "gpo", "politica de grupo", "ntfs", "wsus", "windows server", "dominio windows", "registro do windows", "smb", "iis", "dns do windows"]),
  no("ti.so.conceitos", "Conceitos de sistemas operacionais", ["sistema operacional", "sistemas operacionais", "processo", "thread", "escalonamento", "memoria virtual", "paginacao", "segmentacao", "sistema de arquivos", "semaforo", "interrupcao", "mutex", "condicao de corrida", "multiprogramacao", "swap", "filesystem"]),
  // ---- Governança e gestão
  no("ti.gov.servicos", "Gerenciamento de serviços (ITIL)", ["itil", "gerenciamento de servicos", "gerenciamento de incidentes", "gerenciamento de problemas", "gerenciamento de mudancas", "catalogo de servicos", "service desk", "central de servicos", "acordo de nivel de servico", "sla", "iso 20000", "cmdb", "ciclo de vida do servico"]),
  no("ti.gov.governanca", "Governança de TI", ["cobit", "governanca de ti", "governanca corporativa", "iso 38500", "alinhamento estrategico", "planejamento estrategico de ti", "pdti", "balanced scorecard", "bsc", "indicadores de desempenho", "gestao de portfolio", "gestao por processos", "gestao de riscos de ti", "comite de ti"]),
  no("ti.gov.projetos", "Gerenciamento de projetos", ["pmbok", "gerenciamento de projetos", "eap", "estrutura analitica", "cronograma", "caminho critico", "valor agregado", "pmi", "prince2", "escopo do projeto", "partes interessadas", "stakeholder", "termo de abertura", "gerente de projetos", "pert", "pmo"]),
  no("ti.gov.contratacoes", "Contratações de TI", ["contratacao de solucoes de ti", "in 01/2019", "sisp", "termo de referencia", "estudo tecnico preliminar", "etp", "lei 14.133", "14.133", "8.666", "pregao", "gestao de contratos", "fiscal de contrato", "ata de registro de precos", "contratacao de tic", "gestor do contrato"]),
  no("ti.gov.arquitetura", "Arquitetura corporativa e processos", ["arquitetura corporativa", "togaf", "zachman", "bpm", "bpmn", "mapeamento de processos", "processo de negocio", "modelagem de processos", "bpmn 2.0", "cadeia de valor", "reengenharia de processos"]),
  // ---- Nuvem, DevOps e arquitetura
  no("ti.nuvem.virtualizacao", "Virtualização", ["vmware", "hyper-v", "virtualizacao", "hipervisor", "hypervisor", "maquina virtual", "maquinas virtuais", "kvm", "xen", "vsphere", "virtualbox", "vdi"]),
  no("ti.nuvem.containers", "Containers e orquestração", ["docker", "kubernetes", "container", "containers", "conteiner", "orquestracao", "pod", "pods", "helm", "openshift", "dockerfile", "rancher", "k8s", "kubernets", "kube-scheduler", "kube-apiserver", "kubelet", "etcd", "kubectl"]),
  no("ti.nuvem.cloud", "Computação em nuvem", ["computacao em nuvem", "nuvem", "iaas", "paas", "saas", "aws", "azure", "google cloud", "nuvem hibrida", "nuvem publica", "serverless", "elasticidade", "faas", "multi-tenant"]),
  no("ti.nuvem.devops", "DevOps e automação", ["devops", "devsecops", "ci/cd", "integracao continua", "entrega continua", "jenkins", "gitlab", "ansible", "terraform", "infraestrutura como codigo", "observabilidade", "prometheus", "grafana", "pipeline", "puppet", "chef", "sonarqube", "deploy"]),
  no("ti.nuvem.arquitetura", "Arquitetura de sistemas distribuídos", ["microsservico", "microsservicos", "microservico", "arquitetura distribuida", "soa", "api gateway", "mensageria", "rabbitmq", "kafka", "message broker", "service mesh", "balanceamento de carga", "alta disponibilidade", "escalabilidade", "cache distribuido", "sistemas distribuidos", "event-driven", "webhook", "service discovery", "load balancer"]),
  // ---- Infraestrutura
  no("ti.infra.armazenamento", "Armazenamento e backup", ["raid", "san", "nas", "storage", "backup", "fita magnetica", "lto", "deduplicacao", "snapshot", "rpo", "rto", "armazenamento", "fibre channel", "iscsi", "ssd", "disco rigido", "backup incremental", "backup diferencial"]),
  no("ti.infra.datacenter", "Data center", ["datacenter", "data center", "nobreak", "ups", "refrigeracao", "tia-942", "tier", "cabeamento de datacenter", "sala cofre", "climatizacao", "gerador", "pue"]),
  no("ti.infra.hardware", "Arquitetura de computadores", ["processador", "cpu", "memoria ram", "barramento", "pci", "sata", "risc", "cisc", "pipeline de instrucoes", "memoria cache", "arquitetura de computadores", "hardware", "placa-mae", "gpu", "ula", "registrador", "clock", "numeros binarios", "sistema de numeracao", "conversao de base", "hexadecimal"]),
  no("ti.infra.monitoramento", "Monitoramento e operação", ["zabbix", "nagios", "monitoramento", "logs", "elk", "kibana", "fluentd", "noc", "gerencia de redes", "snmp trap", "capacity planning", "itsm"]),
  // ---- Dados e IA
  no("ti.dados.ml", "Aprendizado de máquina", ["aprendizado de maquina", "machine learning", "rede neural", "redes neurais", "deep learning", "aprendizado supervisionado", "aprendizado nao supervisionado", "scikit", "tensorflow", "pytorch", "keras", "overfitting", "sobreajuste", "regressao", "classificacao", "clusterizacao", "k-means", "arvore de decisao", "random forest", "matriz de confusao", "curva roc", "validacao cruzada"]),
  no("ti.dados.ciencia", "Ciência e visualização de dados", ["ciencia de dados", "analise exploratoria", "visualizacao de dados", "power bi", "tableau", "pandas", "estatistica descritiva", "mediana", "desvio padrao", "correlacao", "pre-processamento", "etl de dados", "qualidade de dados", "governanca de dados", "dama", "catalogo de dados", "data lineage", "dados abertos"]),
  no("ti.dados.ia", "Inteligência artificial", ["inteligencia artificial", "processamento de linguagem natural", "pln", "nlp", "llm", "algoritmo genetico", "logica fuzzy", "sistemas especialistas", "agente inteligente", "busca heuristica", "chatbot", "ia generativa", "visao computacional"]),
  // ---- Sistemas de informação
  no("ti.si.conceitos", "Sistemas de informação e governo digital", ["sistemas de informacao", "erp", "crm", "sistema de apoio a decisao", "gestao do conhecimento", "comercio eletronico", "governo eletronico", "e-ping", "governo digital", "transformacao digital", "sistema de informacao gerencial", "automacao de escritorio", "gestao documental", "gestao eletronica de documentos", "ged", "workflow", "intranet", "extranet"]),
  // ---- Gerais
  no("ti.geral.portugues", "Língua Portuguesa", ["interpretacao de texto", "concordancia verbal", "concordancia nominal", "regencia", "crase", "pontuacao", "virgula", "coesao", "coerencia", "reescrita", "ortografia", "morfossintatic", "sintaxe", "pronome", "pronomes", "no texto", "segundo o texto", "de acordo com o texto", "no trecho", "ao substituir", "oracao", "locucao", "conjuncao", "adverbio", "substantivo", "adjetivo", "verbo", "sujeito", "predicado", "acentuacao", "colocacao pronominal", "tipologia textual", "genero textual", "figuras de linguagem", "paragrafo", "periodo", "vocabulo", "sentido da palavra"]),
  no("ti.geral.logica", "Raciocínio lógico e matemática", ["proposicao", "proposicoes", "tabela-verdade", "tabela verdade", "conectivo", "equivalencia logica", "negacao de", "silogismo", "probabilidade", "analise combinatoria", "diagrama de venn", "sequencia numerica", "porcentagem", "razao e proporcao", "regra de tres", "juros simples", "juros compostos", "conjuntos", "argumento valido", "falacia", "logica sentencial", "logica de argumentacao", "contagem", "permutacao", "combinacao", "arranjo", "progressao aritmetica", "progressao geometrica", "tautologia", "contradicao", "contrapositiva"]),
  no("ti.geral.ingles", "Língua Inglesa", ["according to the", "the text", "which of the following", "the author", "in the text", "the passage", "is correct", "english", "the word", "refers to", "can be inferred", "mentioned in the", "of the", "it is", "there is", "has been", "the following"]),
  no("ti.geral.dadm", "Direito Administrativo", ["administracao publica", "ato administrativo", "atos administrativos", "servidor publico", "8.112", "improbidade", "poderes administrativos", "poder de policia", "responsabilidade civil do estado", "agentes publicos", "controle da administracao", "principios da administracao", "9.784", "processo administrativo", "concessao", "permissao de servico", "administracao indireta", "autarquia", "licitacao", "contrato administrativo", "discricionariedade", "poder hierarquico", "servicos publicos", "improbidade administrativa"]),
  no("ti.geral.dcon", "Direito Constitucional", ["constituicao federal", "direitos fundamentais", "poder legislativo", "poder judiciario", "poder executivo", "controle de constitucionalidade", "direitos sociais", "organizacao do estado", "emenda constitucional", "ministerio publico", "conselho nacional de justica", "stf", "habeas corpus", "mandado de seguranca", "direitos politicos", "separacao de poderes", "clausula petrea", "federacao", "uniao, estados", "congresso nacional", "controle externo", "tribunal de contas"]),
  no("ti.geral.adm", "Administração e finanças públicas", ["planejamento estrategico", "gestao de pessoas", "administracao geral", "orcamento publico", "lei de responsabilidade fiscal", "ppa", "loa", "ldo", "etica no servico publico", "lei 8.429", "gestao publica", "balanco patrimonial", "contabilidade publica", "arquivologia", "protocolo", "redacao oficial", "manual de redacao"]),
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");

// Siglas curtas que, sozinhas, já identificam o assunto (as demais siglas curtas valem menos por serem ambíguas).
const SIGLAS_FORTES = new Set(["sql", "tcp", "udp", "dns", "dhcp", "uml", "git", "aes", "rsa", "ssl", "tls", "lan", "wan", "vpn", "raid", "etl", "olap", "nas", "san", "itil", "cobit", "scrum", "java", "ddl", "dml", "dcl", "http", "ftp", "smtp", "snmp", "ldap", "ospf", "bgp", "vlan", "nat", "xss", "csrf", "lgpd", "pmbok", "bpm", "soa", "rest", "json", "xml", "html", "css", "bash", "linux", "jwt", "sso", "mfa", "ids", "ips", "waf", "tdd", "bdd", "kvm", "iaas", "paas", "saas", "ci/cd", "wifi", "wlan", "mpls", "voip", "pert", "cpu", "ssd", "gpu", "nosql", "icmp", "arp", "ipv4", "ipv6", "ssh", "oauth", "cmmi", "togaf", "devops", "ansible", "docker", "python", "mongodb", "spark", "hadoop"]);

type Compilado = { no: NoCompetencia; regs: { re: RegExp; peso: number }[] };

// Termos acrescentados a partir do que apareceu nas provas e editais reais (ver `npm run taxonomia:sugerir`).
const EXTRAS: Record<string, string[]> = {
  "ti.bd.sql": ["linguagem de consulta", "consulta sql", "clausula", "comando select", "inner join", "left join"],
  "ti.bd.admin": ["mysql", "oracle", "sql server", "postgres", "dbms", "dba"],
  "ti.seg.gestao": ["analise de riscos", "gestao de riscos", "vulnerabilidades", "ameacas", "ativos de informacao", "seguranca da informacao", "seguranca de informacao", "seguranca cibernetica", "seguranca em redes", "seguranca de aplicacoes", "seguranca de dados", "incidente de seguranca", "seguranca fisica", "auditoria de ti", "norma iso", "abnt nbr", "risco", "riscos", "tratamento de riscos", "politica de seguranca da informacao", "conformidade"],
  "ti.seg.ameacas": ["seguranca de redes", "ataques", "intrusao", "forense", "computacao forense", "criptoanalise", "exploit", "zero-day", "spoofing", "sniffing", "man-in-the-middle", "brute force", "forca bruta"],
  "ti.es.modelagem": ["diagrama de pacotes", "diagramas de pacotes", "diagrama de componente", "diagramas de componente", "diagrama de implantacao", "diagrama de estados", "diagrama de objetos", "diagrama de classe", "uml 2", "padrao de projeto", "arquitetura de software", "analise orientada a objetos"],
  "ti.es.processos": ["programacao extrema", "extreme programming", "xp", "desenvolvimento agil", "prototipo", "espiral", "iterativo", "incremental", "melhoria de processo", "processo unificado", "iso/iec 12207", "engenharia de software"],
  "ti.es.testes": ["testes", "teste", "caso de teste", "testador", "validacao e verificacao", "inspecao de software"],
  "ti.es.metricas": ["manutencao", "evolucao de software", "reuso de software", "reutilizacao", "linha de produto"],
  "ti.es.requisitos": ["requisito", "requisitos", "stakeholders", "elicitacao", "negociacao de requisitos"],
  "ti.prog.poo": ["classe", "classes", "atributo", "trecho de codigo", "codigo a seguir", "programa a seguir", "pseudocodigo", "interface", "this", "super"],
  "ti.prog.linguagens": ["dhtml", "responsivo", "responsiva", "layout fluido", "media queries", "bootstrap", "sass", "webassembly", "android", "ios", "mobile", "aplicativo movel", "aplicativos moveis", "hibernate", "orm", "jdbc", "javabeans", "ejb", "jee", "j2ee", "json web", "sitio responsivo", "sitios responsivos", "front-end", "back-end", "frontend", "backend"],
  "ti.prog.web": ["usabilidade", "sitio", "sitios", "pagina web", "paginas web", "navegador", "browser", "seo", "otimizacao para motores de busca", "web 2.0", "http/2", "cdn", "portal", "ux", "interface do usuario", "acessibilidade", "websites", "site"],
  "ti.redes.protocolos": ["apache", "nginx", "virtual host", "servidor web", "servidor de aplicacao", "proxy", "proxy reverso", "iptv", "multicast", "broadcast", "servidor de e-mail", "correio eletronico", "tomcat", "jboss", "wildfly"],
  "ti.redes.modelos": ["jumbo frame", "jumbo frames", "mtu", "quadro", "quadros", "enlace", "protocolo de rede", "comunicacao de dados", "meio de transmissao"],
  "ti.redes.meios": ["cabos metalicos", "categoria 7", "cat5e", "cat6", "cat7", "vsat", "satelite", "radioenlace", "microondas", "banda ka", "telecomunicacoes", "antena", "enlace de radio", "amplificador", "sinal", "espectro"],
  "ti.redes.voz": ["telefonia", "pabx", "asterisk", "streaming", "iptv"],
  "ti.dados.ia": ["modelo generativo", "modelos generativos", "prompt", "prompts", "modelo de linguagem", "ia generativa", "engenharia de prompt", "rag", "embeddings", "transformer", "gpt"],
  "ti.gov.contratacoes": ["fiscal do contrato", "fiscalizacao contratual", "gestao contratual", "clausulas de sla", "ans", "acordo de nivel", "contrato de ti", "terceirizacao de ti", "metrica homem-hora", "homem-hora", "remuneracao por resultados", "contratacao de servicos de tic"],
  "ti.gov.servicos": ["servicos de ti", "indisponibilidade", "disponibilidade", "gerenciamento de capacidade", "gerenciamento de nivel de servico"],
  "ti.gov.projetos": ["projeto", "projetos", "gerenciamento do escopo", "gerenciamento de riscos", "partes interessadas", "gerenciamento do tempo", "gerenciamento de custos"],
  "ti.gov.governanca": ["governanca", "estrategia de ti", "gestao estrategica", "indicadores", "maturidade", "cmmi-dev", "ciclo pdca", "pdca", "melhoria continua", "etica na ti"],
  "ti.nuvem.arquitetura": ["datacenters", "gateways", "resiliencia", "tolerancia a falhas", "cluster", "failover", "arquitetura de microsservicos", "sistemas de alta disponibilidade"],
  "ti.infra.hardware": ["circuito", "eletronica digital", "porta logica", "portas logicas", "algebra booleana", "microcontrolador", "arduino", "sistemas embarcados", "embarcado", "fpga"],
  "ti.dados.ciencia": ["mineracao", "estatistica", "dados estruturados", "dados nao estruturados", "analitica", "analytics", "dashboard", "indicador de desempenho"],
  "ti.si.conceitos": ["sistema de informacao", "sistemas informatizados", "gestao arquivistica", "gestao documental", "documento eletronico", "assinatura eletronica", "processo eletronico", "pje", "sei", "e-gov", "governo digital", "cidades inteligentes", "iot", "internet das coisas"],
  "ti.geral.portugues": ["emprego", "classes de palavras", "generos textuais", "tipologias textuais", "compreensao e interpretacao", "substituicao de palavras", "redacao oficial", "oficio", "memorando", "vocabulo", "palavras", "texto", "textos", "paragrafos", "frase", "frases", "lingua portuguesa", "linguagem", "regencia verbal", "reescrita de frases", "sinonimo", "ambiguidade", "denotacao", "conotacao", "coesao textual"],
  "ti.geral.dadm": ["decreto", "decretos", "instrucao normativa", "etica no servico publico", "etica profissional", "codigo de etica", "lei 8.112", "servidores publicos", "agentes publicos", "disposicoes", "administracao direta", "regime juridico", "probidade", "conflito de interesses", "nepotismo", "licitacoes", "contratos administrativos", "controle interno"],
  "ti.geral.dcon": ["constituicao", "constitucional", "estado de direito", "direitos humanos", "garantias constitucionais", "separacao dos poderes", "controle externo", "tribunal de contas", "ministerio publico", "defensoria publica", "poder constituinte", "federalismo"],
  "ti.geral.adm": ["orcamento", "receita publica", "receitas publicas", "despesa publica", "despesas publicas", "empenho", "credito orcamentario", "credito adicional", "administracao financeira", "contabilidade publica", "patrimonio", "gestao de pessoas", "lideranca", "motivacao", "cultura organizacional", "planejamento estrategico", "desenvolvimento organizacional", "estrutura organizacional", "gestao publica", "administracao publica gerencial", "new public management", "governanca publica", "gestao da qualidade", "balanced scorecard", "arquivologia", "protocolo", "gestao da informacao", "gestao do conhecimento"],
  "ti.geral.logica": ["raciocinio logico", "logica", "conjunto", "conjuntos", "diagrama", "probabilidades", "estatistica basica", "media aritmetica", "mediana", "moda", "desvio", "amostra", "amostragem", "hipotese nula", "intervalo de confianca", "porcentagens", "equacao", "funcao", "matematica", "geometria", "area do", "volume"],
  "ti.geral.ingles": ["the", "and", "that", "which", "with", "according", "text", "author", "mentions", "implies"],
};

const COMPILADO: Compilado[] = COMPETENCIAS.map((n) => ({
  no: n,
  regs: [...n.termos, ...(EXTRAS[n.id] ?? [])].map((t) => {
    const termo = norm(t);
    const peso = termo.includes(" ") || termo.includes("/") ? 3 : termo.length >= 5 || SIGLAS_FORTES.has(termo) ? 2 : 1.2;
    // aceita plural simples (sitio/sitios, classe/classes, protocolo/protocolos)
    const plural = /[a-z]$/.test(termo) && !termo.endsWith("s") ? "(?:s|es)?" : "";
    return { re: new RegExp(`(?<![a-z0-9])${esc(termo)}${plural}(?![a-z0-9])`, "g"), peso };
  }),
}));

export type Classificacao = { id: string; pontos: number };

function pontuar(texto: string, mult: number, acc: Map<string, number>) {
  for (const c of COMPILADO) {
    let s = 0;
    for (const { re, peso } of c.regs) {
      const m = texto.match(re);
      if (m) s += peso * Math.min(3, m.length);
    }
    if (s > 0) acc.set(c.no.id, (acc.get(c.no.id) ?? 0) + s * mult);
  }
}

/** Competências candidatas para um texto (enunciado pesa mais que as alternativas). */
export function classificar(enunciado: string, alternativas = ""): Classificacao[] {
  const acc = new Map<string, number>();
  pontuar(norm(enunciado), 1, acc);
  if (alternativas) pontuar(norm(alternativas), 0.6, acc);
  return [...acc.entries()].map(([id, pontos]) => ({ id, pontos })).sort((a, b) => b.pontos - a.pontos);
}

export const PONTOS_MINIMOS = 2;

/** Melhor competência, ou null quando o sinal é fraco demais. */
export function melhorCompetencia(enunciado: string, alternativas = ""): string | null {
  const r = classificar(enunciado, alternativas);
  return r.length && r[0].pontos >= PONTOS_MINIMOS ? r[0].id : null;
}

export function competenciaPorId(id: string): NoCompetencia | undefined {
  return COMPETENCIAS.find((c) => c.id === id);
}

export function nomeGrupo(id: string): string {
  const g = id.split(".")[1] ?? "";
  return GRUPOS[g] ?? g;
}

export const eGeral = (id: string) => id.startsWith("ti.geral.");
