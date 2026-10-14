from pathlib import Path
from copy import deepcopy
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib, json, shutil, tempfile
from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.shared import Inches, Pt, RGBColor, Twips
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.section import WD_SECTION_START
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT=Path(__file__).resolve().parent
OUT=ROOT.parent/'OpthaEdge_Research_Paper.docx'
SOURCE=Path(r'c:\Users\Faizan Shaikh\OneDrive - ApexQuants\Documents\Diabetic_Retinopathy_Research_Paper.docx')
FIG=ROOT/'figures'; FIG.mkdir(exist_ok=True)
SOURCE_HASH=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
BLUE='#244963'; PALE='#edf3f7'; GRAY='#59616a'; INK='#17232e'
FONTS=Path('C:/Windows/Fonts')
def font(size,bold=False): return ImageFont.truetype(str(FONTS/('arialbd.ttf' if bold else 'arial.ttf')),size)

def canvas(h):
    im=Image.new('RGB',(1500,h),'white'); return im,ImageDraw.Draw(im)
def box(dr,xy,title,lines=(),fill=PALE,dashed=False):
    x,y,w,h=xy
    dr.rounded_rectangle((x,y,x+w,y+h),radius=15,fill=fill,outline=BLUE,width=4)
    if dashed:
        # A labeled schema-only group is semantically distinct even in grayscale.
        dr.text((x+w-20,y+14),'SCHEMA',font=font(23,True),fill=GRAY,anchor='ra')
    title_size=46
    while dr.textlength(title,font=font(title_size,True))>w-38:title_size-=1
    dr.text((x+w/2,y+24),title,font=font(title_size,True),fill=INK,anchor='ma')
    for i,t in enumerate(lines):
        text_size=44
        while dr.textlength(t,font=font(text_size))>w-36:text_size-=1
        dr.text((x+w/2,y+83+i*44),t,font=font(text_size),fill=INK,anchor='ma')
def arrow(dr,a,b):
    import math
    dr.line([a,b],fill=BLUE,width=5)
    ang=math.atan2(b[1]-a[1],b[0]-a[0]); sz=19
    pts=[b,(b[0]-sz*math.cos(ang-.45),b[1]-sz*math.sin(ang-.45)),(b[0]-sz*math.cos(ang+.45),b[1]-sz*math.sin(ang+.45))]
    dr.polygon(pts,fill=BLUE)
def save(im,name): im.save(FIG/name,dpi=(420,420))

im,dr=canvas(1500)
box(dr,(220,20,1060,160),'Browser research workspace',['Mode selection, image upload and result review'])
dr.line([(750,180),(750,210),(400,210)],fill=BLUE,width=5)
dr.line([(750,210),(1100,210)],fill=BLUE,width=5)
arrow(dr,(400,210),(400,240));arrow(dr,(1100,210),(1100,240))
box(dr,(90,240,620,210),'POST /api/predict',['File and mode checks','No session or approval gate'])
box(dr,(790,240,620,210),'Patient server actions',['Development session','Role and tenant checks'])
arrow(dr,(400,450),(400,515));arrow(dr,(1100,450),(1100,515))
box(dr,(90,515,620,210),'Inference module',['Sharp preprocessing','Cached ONNX CPU sessions'])
box(dr,(790,515,620,210),'Patient data access',['Minimal display DTOs','Transactional audit'])
arrow(dr,(400,725),(400,790));arrow(dr,(1100,725),(1100,790))
box(dr,(90,790,620,245),'Local model artifacts',['Binary: 224 x 224 input','Severity: 299 x 299 input','Versioned registry'])
box(dr,(790,790,620,245),'Prisma and PostgreSQL',['Tenant-scoped records','Synthetic seed data','No screening persistence'])
arrow(dr,(400,1035),(400,1100))
box(dr,(90,1100,620,210),'Validate and decode',['Count and finite checks','Softmax and response'])
box(dr,(790,1100,620,210),'Planned services',['OIDC and image storage','Quality gate and worker'],fill='#f4f4f4')
dr.text((750,1385),'Current research inference and patient records are separate paths.',font=font(33,True),fill=INK,anchor='ma')
dr.text((750,1435),'A database schema does not imply an active clinical workflow.',font=font(31),fill=GRAY,anchor='ma')
save(im,'architecture.png')

im,dr=canvas(1450)
box(dr,(220,20,1060,190),'Decode JPEG or PNG',['Check file signature, MIME, size and dimensions','File validation does not assess retinal gradability'])
arrow(dr,(750,210),(750,265));dr.line([(350,265),(1150,265)],fill=BLUE,width=5)
arrow(dr,(350,265),(350,320));arrow(dr,(1150,265),(1150,320))
box(dr,(40,320,650,210),'Binary preprocessing',['Cover resize to 224 x 224','(pixel / 255 - mean) / std'])
box(dr,(810,320,650,210),'Severity preprocessing',['Cover resize to 299 x 299','pixel / 127.5 - 1'])
arrow(dr,(365,530),(365,595));arrow(dr,(1135,530),(1135,595))
box(dr,(40,595,650,210),'Binary ONNX execution',['float32 [1, 3, 224, 224]','Two output logits'])
box(dr,(810,595,650,210),'Severity ONNX execution',['float32 [1, 3, 299, 299]','Five output logits'])
arrow(dr,(365,805),(365,870));arrow(dr,(1135,805),(1135,870))
box(dr,(40,870,650,230),'Binary decoding',['Stable softmax','DR if score is at least 0.5','Unvalidated threshold'])
box(dr,(810,870,650,230),'Severity decoding',['Stable softmax','Argmax and weighted index','Unverified label order'])
arrow(dr,(365,1100),(365,1170));arrow(dr,(1135,1100),(1135,1170))
dr.line([(365,1170),(1135,1170)],fill=BLUE,width=5);arrow(dr,(750,1170),(750,1220))
box(dr,(170,1220,1160,185),'Research result or structured error',['Model identifier, artifact version and preprocessing version','Normalized scores are not calibrated clinical probabilities'])
save(im,'inference.png')

im,dr=canvas(1330)
box(dr,(390,20,720,150),'Organization',['Tenant boundary for records'])
arrow(dr,(750,170),(750,230))
box(dr,(390,230,720,150),'Patient',['Demographics, identifiers and consent'])
arrow(dr,(750,380),(750,460))
box(dr,(390,460,720,150),'Examination',['Patient, laterality-aware image records'],fill='#f4f4f4')
box(dr,(70,680,620,190),'EyeImage',['Object key, content hash','Capture metadata and laterality'],fill='#f4f4f4')
box(dr,(810,680,620,190),'ModelVersion',['Artifact identity and labels','Validation and approval metadata'],fill='#f4f4f4')
arrow(dr,(750,610),(380,680));arrow(dr,(380,870),(650,940));arrow(dr,(1120,870),(850,940))
box(dr,(390,940,720,190),'Prediction',['Links image to a model version','Per-label PredictionProbability records'],fill='#f4f4f4')
dr.text((750,1190),'Blue: development patient records',font=font(44),fill=INK,anchor='ma')
dr.text((750,1250),'Gray: schema only for screening data',font=font(44),fill=INK,anchor='ma')
save(im,'data_model.png')

# Reuse authentic screenshots captured through the browser UI.
for name in ['screening','upload','models']:
    original=Path(tempfile.gettempdir())/f'optha-{name}.png'
    if original.exists():shutil.copy2(original,FIG/f'{name}.png')

d=Document(SOURCE)
sect=deepcopy(d.sections[0]._sectPr)
body=d._element.body
for child in list(body):body.remove(child)
body.append(sect)
normal=d.styles['Normal'];normal.font.name='Times New Roman';normal.font.size=Pt(10);normal.font.bold=False;normal.font.italic=False;normal.font.color.rgb=RGBColor(0,0,0)
normal.paragraph_format.space_after=Pt(5);normal.paragraph_format.space_before=Pt(0);normal.paragraph_format.line_spacing=1.0
for name,size in [('Title',20),('Heading 1',10),('Heading 2',10),('Caption',8.5)]:
    s=d.styles[name];s.font.name='Times New Roman';s.font.size=Pt(size);s.font.color.rgb=RGBColor(0,0,0)
    s.font.bold=False;s.font.italic=False
    s.paragraph_format.space_before=Pt(8 if 'Heading' in name else 0);s.paragraph_format.space_after=Pt(5);s.paragraph_format.line_spacing=1
    s.paragraph_format.keep_with_next='Heading' in name
    if name=='Heading 1':s.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.CENTER
    if name=='Heading 2':s.font.italic=True
    for tag in ['w:pBdr','w:shd']:
        for el in s.element.findall('.//'+tag, s.element.nsmap):el.getparent().remove(el)
def columns(section,n):
    cols=section._sectPr.find(qn('w:cols'));cols.set(qn('w:num'),str(n));cols.set(qn('w:space'),'240')
    for ch in list(cols):cols.remove(ch)
columns(d.sections[0],1)
def p(text='',style=None,bold=False,italic=False,size=None,align=None):
    pp=d.add_paragraph(style=style);rr=pp.add_run(text);rr.bold=bold;rr.italic=italic
    rr.font.name='Times New Roman';rr.font.color.rgb=RGBColor(0,0,0)
    if size:rr.font.size=Pt(size)
    pp.alignment=align if align is not None else (WD_ALIGN_PARAGRAPH.CENTER if style in ['Title','Heading 1'] else WD_ALIGN_PARAGRAPH.JUSTIFY)
    pp.paragraph_format.widow_control=True
    return pp
def h(text):p(text,'Heading 1')
def sub(text):p(text,'Heading 2',italic=True,align=WD_ALIGN_PARAGRAPH.LEFT)
def fig(name,caption,width=3.50):
    pp=d.add_paragraph();pp.alignment=WD_ALIGN_PARAGRAPH.CENTER;pp.paragraph_format.keep_with_next=True;pp.paragraph_format.space_after=Pt(3)
    shape=pp.add_run().add_picture(str(FIG/name),width=Inches(width));shape._inline.docPr.set('descr',caption)
    cp=p(caption,'Caption',size=8.5,align=WD_ALIGN_PARAGRAPH.LEFT);cp.paragraph_format.keep_together=True
def table(caption,headers,rows,widths):
    cp=p(caption,size=8.5,align=WD_ALIGN_PARAGRAPH.CENTER);cp.paragraph_format.keep_with_next=True
    t=d.add_table(rows=1, cols=len(headers));t.autofit=False
    for col,w in zip(t.columns,widths):col.width=Inches(w)
    for cell,w in zip(t.rows[0].cells,widths):cell.width=Inches(w)
    for i,txt in enumerate(headers):t.rows[0].cells[i].text=txt
    for vals in rows:
        cells=t.add_row().cells
        for c,txt,w in zip(cells,vals,widths):c.text=txt;c.width=Inches(w)
    for ri,row in enumerate(t.rows):
        trPr=row._tr.get_or_add_trPr();el=OxmlElement('w:cantSplit');trPr.append(el)
        if ri==0:trPr.append(OxmlElement('w:tblHeader'))
        for ci,c in enumerate(row.cells):
            tcPr=c._tc.get_or_add_tcPr();b=OxmlElement('w:tcBorders')
            for side in ['top','left','bottom','right']:
                e=OxmlElement('w:'+side);e.set(qn('w:val'),'single');e.set(qn('w:sz'),'4');e.set(qn('w:color'),'D9D9D9');b.append(e)
            tcPr.append(b);mar=OxmlElement('w:tcMar')
            for side,val in [('top','65'),('bottom','65'),('left','65'),('right','65')]:
                e=OxmlElement('w:'+side);e.set(qn('w:w'),val);e.set(qn('w:type'),'dxa');mar.append(e)
            tcPr.append(mar)
            if ri==0:
                sh=OxmlElement('w:shd');sh.set(qn('w:fill'),'E7EDF2');tcPr.append(sh)
            for pp in c.paragraphs:
                pp.alignment=WD_ALIGN_PARAGRAPH.LEFT;pp.paragraph_format.space_after=Pt(0);pp.paragraph_format.line_spacing=1
                for rr in pp.runs:rr.font.name='Times New Roman';rr.font.size=Pt(8);rr.bold=ri==0;rr.font.color.rgb=RGBColor(0,0,0)
    p('').paragraph_format.space_after=Pt(1)

p('OpthaEdge for Diabetic Retinopathy\nResearch Screening and Model Governance','Title',size=20)
p('Shamail Pawar, Faizan Mustafa Shaikh and Ayaan Shaikh',size=11,align=WD_ALIGN_PARAGRAPH.CENTER)
p('Department of Electronics & Computer Science Engineering\nVidyalankar Institute of Technology, Mumbai, India',size=10,align=WD_ALIGN_PARAGRAPH.CENTER)
p('shamail.pawar@vit.edu.in   |   faizanmustaffa.shaikh@vit.edu.in   |   ayaan.shaikh24@vit.edu.in',size=9,align=WD_ALIGN_PARAGRAPH.CENTER)
sec=d.add_section(WD_SECTION_START.CONTINUOUS);columns(sec,2)
abstract='Abstract. OpthaEdge is a research-stage web platform for reviewing diabetic retinopathy model outputs from fundus photographs. This paper describes its implemented inference workflow, patient-record foundation and model-governance boundaries. A Next.js application accepts JPEG or PNG uploads, validates file content, applies task-specific preprocessing and executes one of two local ONNX artifacts on the CPU. The binary path uses 224 x 224 inputs and two output logits; the severity path uses 299 x 299 inputs and five logits. A registry associates each response with artifact and preprocessing versions while recording unresolved validation requirements. A separate organization-scoped data-access layer supports synthetic development patient records. Technical verification comprised 12 existing unit tests and nine local HTTP checks, all of which passed, together with successful static type and lint checks. The HTTP checks included two executions on a generated non-retinal image, so they establish runtime operation rather than diagnostic performance. Training provenance, verified label order, clinical test data and calibration evidence remain unavailable. OpthaEdge therefore provides an inspectable research integration, with clinical accuracy and deployment suitability left unestablished.'
p(abstract,bold=True,size=9)
p('Keywords: diabetic retinopathy; ONNX inference; fundus imaging; research software; model governance; patient records.',italic=True,size=9)
h('I  INTRODUCTION')
p('Diabetic retinopathy (DR) affects retinal blood vessels and can threaten vision. Early disease may be asymptomatic, which makes regular eye assessment important [1]. Deep learning has enabled automated analysis of retinal photographs, but a model that executes successfully is not necessarily a dependable screening system. The surrounding software must preserve the meaning of its input, output and intended use.')
p('Published DR studies have evaluated algorithms against expert reference standards and independent image collections [2], [3]. Prospective work has also examined autonomous screening in primary-care settings [4]. These results depend on the specific model, study population, imaging procedure and decision threshold. They cannot be transferred to an unrelated model artifact simply because it uses a similar architecture or produces the same number of classes.')
p('OpthaEdge addresses the integration layer between exported models and a research interface. Its current implementation combines two server-side inference paths, explicit model metadata, structured errors and a development patient-record workflow. This paper documents that implementation and tests its technical behavior. It does not introduce a newly trained classifier or report a clinical diagnostic-accuracy study.')
p('The contribution is an inspectable system description: a traceable path from uploaded bytes to decoded model scores, a clear separation between implemented and deferred clinical functions, and reproducible checks of selected software boundaries. Keeping these boundaries visible is necessary when training records and clinical validation packages are incomplete.')
h('II  RELATED WORK')
p('Gulshan et al. evaluated deep learning for detecting referable DR using retinal photographs and separate validation datasets [2]. Ting et al. examined a deep learning system across multiethnic populations and multiple eye-disease tasks [3]. These studies establish the importance of independent evaluation and explicit target definitions. OpthaEdge has neither an equivalent reference-standard dataset nor evidence that its artifacts reproduce those systems.')
p('Abramoff et al. studied an autonomous DR system prospectively in primary-care offices [4]. That study illustrates the additional evidence needed beyond retrospective image classification: defined enrollment, imaging procedures, reference grading and prespecified endpoints. The present work is limited to software integration and verification, so a numerical comparison with those clinical studies would not be meaningful.')
p('The severity artifact is identified in the project as InceptionV3. Szegedy et al. describe the underlying Inception architecture family [5], but an architecture name does not establish the origin, training procedure or performance of a particular exported file. Similarly, Guo et al. show why normalized neural-network scores require separate calibration assessment [6]. OpthaEdge exposes softmax scores without evidence that they estimate clinical correctness.')
p('Reporting guidance provides a useful framework for future evaluation. CLAIM emphasizes transparent reporting of medical-imaging AI methods and assessment [7], while TRIPOD+AI addresses prediction-model reporting [8]. These documents inform the proposed validation plan; this implementation report does not claim completion of a clinical reporting checklist.')
h('III  SYSTEM ARCHITECTURE')
sub('A  Application and inference services')
p('Figure 1 separates the two implemented application paths. The web application uses Next.js 16.2.1, React 19.2.4 and TypeScript. A client screening component holds the selected task, uploaded file, request state and returned result. The POST /api/predict route runs in the Node.js runtime and invokes server-only preprocessing and inference modules. ONNX Runtime provides the Node.js binding for local model execution [9].')
fig('architecture.png','Fig. 1. Implemented application architecture and explicitly planned services. Research inference does not pass through patient authorization or persist to patient records.')
p('Each model loader reads a local artifact and lazily initializes a CPU inference session with graph optimization enabled. The session and its initialization promise are cached per process, preventing redundant initialization during concurrent first use. A failed initialization clears the pending promise so a later request can attempt loading again. This design avoids a mandatory external inference service, but does not establish edge-device performance or offline operation of the complete platform.')
sub('B  Model registry and deployment state')
p('The registry contains artifact identifiers, SHA-256 versions, input dimensions, assumed label order, preprocessing versions and known limitations. Both entries carry a blocked-pending-validation clinical deployment status. The registry explicitly marks label order, thresholds and correspondence to training preprocessing as unverified, with no validation dataset or metrics attached. Each successful result includes model and preprocessing identity.')
p('The deployment status is descriptive metadata. The current prediction route does not enforce a model-approval gate, authenticate the caller or check patient consent. Research inference remains callable even when clinical deployment is marked blocked. The registry hashes were verified against the two artifact files during this assessment; the runtime loader does not itself recompute and enforce those hashes.')
table('TABLE I  IMPLEMENTED MODEL CONTRACTS',['Property','Binary task','Severity task'],[
('Artifact','retinal_binary_\nmodel.onnx','inceptionv3.onnx'),
('Input tensor','[1, 3, 224, 224]','[1, 3, 299, 299]'),
('Output values','2 float32 logits','5 float32 logits'),
('Decision','DR score >= 0.5','Maximum-score label'),
('Label order','No DR; DR Detected','No DR; Mild; Moderate; Severe; Proliferative'),
('Validation','Pending','Pending')],[.83,1.25,1.42])
h('IV  INFERENCE METHODOLOGY')
sub('A  Input validation')
p('The route requires a file in the image field and an explicit binary or severity mode. It rejects an empty file and files larger than 10 x 1024 x 1024 bytes. JPEG and PNG signatures are checked against the declared MIME type; image/jpg is accepted as a JPEG alias. Sharp inspects dimensions with a 50-million-pixel processing limit. Missing dimensions or decoding failures produce a structured error before model execution.')
p('These checks concern byte format and resource handling. They do not establish that an image depicts a retina, has adequate field of view or is clinically gradable. The upload-size test occurs after multipart parsing, so it should not be described as a complete transport-level denial-of-service defense. No automated image-quality classifier is present.')
sub('B  Task-specific preprocessing')
p('Figure 2 shows the separate preprocessing branches. Both use Sharp cover resizing and remove an alpha channel before converting interleaved pixel values into channel-first float32 tensors. Cover resizing can crop image edges; it is not a lesion-aware crop or an explicit black-border-removal algorithm. No training augmentation, Gaussian-blur enhancement or model fine-tuning is implemented in this inference pipeline.')
p('For the binary path, an 8-bit channel value v is transformed as x_c = (v / 255 - mu_c) / sigma_c, where mu = (0.485, 0.456, 0.406) and sigma = (0.229, 0.224, 0.225). The resulting tensor has dimensions [1, 3, 224, 224]. The severity path uses x = v / 127.5 - 1 and dimensions [1, 3, 299, 299]. These are the implemented transformations, not verified reconstructions of the training pipelines.')
p('The preprocessing functions assume three color channels but do not explicitly convert every decoded color space to RGB. File acceptance therefore does not guarantee compatibility for grayscale or unusual-color-space images. This requires additional testing and an explicit color-conversion policy before broader deployment.')
fig('inference.png','Fig. 2. Task-specific preprocessing and decoding. Both branches assume three-channel inputs; the relationship to original model training remains unverified.')
sub('C  Output decoding and result semantics')
p('The inference module requires a Float32Array output. Decoders check that it contains exactly two or five finite values before normalization. They validate element count, rather than every tensor-axis dimension. For logits z_k, stable softmax computes p_k = exp(z_k - m) / sum_j exp(z_j - m), where m is the maximum logit. Subtracting m reduces numerical overflow.')
p('Binary decoding selects the DR label when p_1 is at least 0.5. Severity decoding chooses argmax_k p_k and also returns the weighted index s = sum from k = 0 to 4 of k p_k. This index is a summary of model scores, not a validated clinical severity measurement. Labels follow the repository assumption in Table I; neither their order nor the binary threshold has been verified from training evidence.')
p('Scores are rounded for display. The highest binary score is labeled as a model probability in the interface, and results carry research-use warnings. Softmax does not establish calibration [6], and a high score cannot justify diagnosis, treatment or referral urgency. Unexpected output counts or non-finite values produce a model-output error with no screening result.')
h('V  PATIENT RECORDS AND PROJECT INTERFACE')
sub('A  Development authentication and data access')
p('Patient functionality follows a separate server-side path. A signed HTTP-only session uses HS256 verification, issuer and audience checks, and an eight-hour expiration. Synthetic authentication is enabled only outside production and requires explicit configuration. The actor is reconstructed from active user membership and role permissions, rather than accepting organization scope from a patient form.')
p('Patient queries require read permission, restrict results to the actor organization, exclude archived records and return at most 50 minimal display records. Patient creation checks permission, validates the organization-scoped identifier and writes the patient, selected consent records and successful audit event in one transaction. These are implemented development services; this assessment did not run an end-to-end database transaction or evaluate real patient information.')
sub('B  Schema and persistence boundaries')
p('The Prisma schema declares organizations, patients, consent, examinations, eye images, model versions, predictions and associated probabilities. Figure 3 summarizes a subset of these relationships. Image records provide fields for object references and content hashes, while prediction records link image and model identity. The schema expresses a future persistence structure; its presence does not demonstrate private image storage or an active examination workflow.')
fig('data_model.png','Fig. 3. Selected relationships in the declared data model. Gray entities are not populated by the current screening route; the diagram does not imply completed longitudinal care.')
p('Screening results remain in browser component state and are not attached to a patient or examination by the current route. Examinations and reports display requirement placeholders. Review-queue and follow-up routes are disabled by module flags even though related database tables remain. Production OIDC, secure image-object storage and an approved quality workflow are still required.')
sub('C  User interaction')
p('The screening interface presents separate binary and severity choices. Selecting a task opens an upload panel; results or structured errors are displayed after the request. Changing mode clears the selected file and result. Additional ocular screening is shown as unavailable. Figure 4 reproduces the actual research interface, and Figure 5 shows the model-information page with its validation warning. These captures contain no patient images or clinical predictions.')
h('VI  TECHNICAL VERIFICATION')
sub('A  Scope and reproducibility')
p('Verification was performed on 29 September 2026 against source commit 0099145dc145. The existing Node.js test runner exercised four test files. Local HTTP checks called the running development prediction route without an authenticated session. A generated 512 x 512 constant-color RGB PNG was used for both successful inference checks; it contained no retinal structures or patient data. Static type checking and linting were also executed.')
p('The binary and severity artifact SHA-256 prefixes were dfc49e28bb3927ec and a75ff338af12bb31b, respectively, matching the registry entries. The verification scripts and raw JSON responses are retained with the manuscript working files. Tests were not used to estimate diagnostic accuracy, compare model quality or measure deployment throughput.')
table('TABLE II  OBSERVED SOFTWARE VERIFICATION',['Check group','Cases','Observed result'],[
('Authorization policy','2','All passed'),
('File signatures and MIME','4','All passed'),
('Output decoding','4','All passed'),
('Patient input validation','2','All passed'),
('HTTP rejection checks','7','All passed'),
('Synthetic RGB inference','2','Both returned HTTP 200'),
('Type checking and lint','2','Both commands passed')],[1.58,.55,1.37])
sub('B  Observed behavior')
p('All 12 existing unit tests passed. The seven rejection checks returned the expected status and error code: missing image, unsupported mode, empty file, MIME mismatch and corrupt PNG returned HTTP 400; non-image content returned HTTP 415; and a file one byte above the 10 MiB limit returned HTTP 413. Both synthetic inference requests returned HTTP 200 with a successful response and the requested mode. Table II reports these finite checks without interpreting them as broad test coverage.')
p('The successful predictions on a constant-color image also expose an important boundary: any supported, decodable image can reach the models. Therefore, success of the runtime checks is compatible with the absence of a retinal-content or gradability gate. The returned labels on this image have no clinical meaning and are deliberately excluded from diagnostic-performance reporting.')
p('The unit tests exercise policy helpers and input schemas, not the complete authentication system, database isolation or audit retention. The HTTP checks do not cover concurrent uploads, transport limits, unusual color spaces, full tensor-shape validation or hostile workloads. These limitations define the scope of the observed results.')
h('VII  DISCUSSION AND LIMITATIONS')
p('OpthaEdge demonstrates that two exported model contracts can be integrated into one research interface while making their unresolved assumptions visible. Separate preprocessors avoid silently applying one input transformation to both artifacts, and explicit output checks prevent arbitrary truncation of malformed model output. Version metadata improves traceability, although runtime digest enforcement is still absent.')
p('The principal scientific limitation is the lack of model provenance and reference-standard evaluation. The project contains no supplied training dataset manifest, patient-level split record, training history, external test set or validation metrics. Consequently, accuracy, sensitivity, specificity, macro-F1, AUROC and weighted kappa cannot be estimated from the available evidence. Training curves and confusion matrices would be unsupported and are not presented.')
p('Security and workflow boundaries also remain incomplete. Production identity, request rate control, a server-enforced approval gate, private image storage and persisted screening audit trails are not established by this implementation. The model-status badge is not an access-control mechanism. Patient-record authorization is separate from inference and must not be taken as protection for every route.')
p('There is no validated lesion localization, segmentation, diabetic macular edema detection or broader ocular-disease model. The severity output alone does not determine referral urgency. A future explanation overlay would need method-specific validation; an attention map would not itself verify the presence of a pathological lesion. Likewise, the product name does not establish execution on a constrained edge device, and no hardware-efficiency claim is made.')
h('VIII  PROSPECTIVE EVALUATION PLAN')
p('A diagnostic evaluation should begin only after the exact artifacts, class order and preprocessing are documented. A study protocol should define the intended population, acquisition devices, clinical target, reference grading, handling of ungradable images and unit of analysis. Multiple images from one patient must remain within a single data partition. Thresholds and calibration parameters should be selected using development data and then frozen before independent testing [7], [8].')
table('TABLE III  EVIDENCE REQUIRED FOR CLINICAL EVALUATION',['Domain','Required evidence'],[
('Model provenance','Training and export records, label order, preprocessing and artifact identity'),
('Reference standard','Grader qualifications, adjudication, target definitions and gradability policy'),
('Binary task','Sensitivity, specificity, predictive values and AUROC with confidence intervals'),
('Severity task','Class counts, confusion matrix, per-class recall, macro-F1 and quadratic weighted kappa'),
('Reliability','Calibration, image rejection, device and subgroup results, external-site evaluation'),
('Deployment','Authenticated inference, approval enforcement, audit, storage and workload testing')],[.86,2.64])
p('Confidence intervals should reflect the patient-level sampling structure, with prespecified analyses across devices, sites and relevant demographic groups. Image rejection and failure rates should be reported alongside classification metrics so that exclusions cannot conceal operational weaknesses. A prospective workflow study would then be needed to examine usability, referral handling and the consequences of incorrect or unavailable results.')
h('IX  CONCLUSION')
p('OpthaEdge is an operational research integration of two ONNX inference paths with explicit preprocessing, output validation, model metadata and a separate development patient-record foundation. Twelve unit tests and nine local HTTP checks passed, supporting the reported software behavior. The work does not establish diagnostic performance. Its next scientific milestone is a provenance-complete, independently evaluated model package; its next engineering milestone is enforced authorization, quality assessment and traceable screening persistence.')
h('ACKNOWLEDGMENT')
p('The authors thank their project guide, Nayana Mahajan, for guidance on this work.')
h('DATA AND ETHICS SCOPE')
p('The technical checks reported here used software fixtures and one generated constant-color image. They did not recruit participants, access identifiable patient records or evaluate patient outcomes. Clinical dataset access, ethics review and consent requirements would need to be addressed separately for any subsequent patient-based study.')

d.add_paragraph().add_run().add_break(WD_BREAK.COLUMN)
h('REFERENCES')
refs=[
'[1] National Eye Institute, "Diabetic Retinopathy." Accessed September 29, 2026. https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/diabetic-retinopathy.',
'[2] V. Gulshan et al., "Development and validation of a deep learning algorithm for detection of diabetic retinopathy in retinal fundus photographs," JAMA, vol. 316, no. 22, pp. 2402-2410, 2016. doi: 10.1001/jama.2016.17216.',
'[3] D. S. W. Ting et al., "Development and validation of a deep learning system for diabetic retinopathy and related eye diseases using retinal images from multiethnic populations with diabetes," JAMA, vol. 318, no. 22, pp. 2211-2223, 2017. doi: 10.1001/jama.2017.18152.',
'[4] M. D. Abramoff, P. T. Lavin, M. Birch, N. Shah and J. C. Folk, "Pivotal trial of an autonomous AI-based diagnostic system for detection of diabetic retinopathy in primary care offices," npj Digital Medicine, vol. 1, art. 39, 2018. doi: 10.1038/s41746-018-0040-6.',
'[5] C. Szegedy, V. Vanhoucke, S. Ioffe, J. Shlens and Z. Wojna, "Rethinking the Inception architecture for computer vision," in Proc. IEEE Conf. Computer Vision and Pattern Recognition, 2016, pp. 2818-2826. doi: 10.1109/CVPR.2016.308.',
'[6] C. Guo, G. Pleiss, Y. Sun and K. Q. Weinberger, "On calibration of modern neural networks," in Proc. 34th Int. Conf. Machine Learning, PMLR, vol. 70, pp. 1321-1330, 2017. https://proceedings.mlr.press/v70/guo17a.html.',
'[7] A. S. Tejani et al., "Checklist for Artificial Intelligence in Medical Imaging (CLAIM): 2024 Update," Radiology: Artificial Intelligence, vol. 6, no. 4, e240300, 2024. doi: 10.1148/ryai.240300.',
'[8] G. S. Collins et al., "TRIPOD+AI statement: updated guidance for reporting clinical prediction models that use regression or machine learning methods," BMJ, vol. 385, e078378, 2024. doi: 10.1136/bmj-2023-078378.',
'[9] ONNX Runtime contributors, "Node.js binding," ONNX Runtime documentation. Accessed September 29, 2026. https://onnxruntime.ai/docs/get-started/with-javascript/node.html.'
]
for ref in refs:
    pp=p(ref,size=9,align=WD_ALIGN_PARAGRAPH.LEFT);pp.paragraph_format.space_after=Pt(7)
    pp.paragraph_format.keep_together=True

# Full-width figure plate preserves readable UI text within the journal page system.
sec=d.add_section(WD_SECTION_START.NEW_PAGE);columns(sec,1)
h('PROJECT INTERFACE FIGURES')
fig('screening.png','Fig. 4. Actual OpthaEdge screening selector. Binary and five-level severity modes are available for research; the additional ocular-disease module remains unavailable. Captured from the local application without patient data.',7.20)
fig('models.png','Fig. 5. Actual model-information page, showing the binary artifact and explicit validation blockers. The clinical status describes missing evidence and does not disable the current research inference endpoint. The lower severity entry is outside this viewport.',7.20)
p('Interface interpretation. These figures document implemented screens rather than a clinical case. The platform can accept an image and display model scores, but neither interface availability nor a successful request establishes disease-detection accuracy. The upload workflow and the registry metadata are described in Sections IV and V.',size=10)

d.core_properties.title='OpthaEdge for Diabetic Retinopathy Research Screening and Model Governance'
d.core_properties.author='Shamail Pawar; Faizan Mustafa Shaikh; Ayaan Shaikh'
d.core_properties.subject='System implementation and technical verification of a research retinal-screening platform'
d.core_properties.keywords='diabetic retinopathy, ONNX, research software, model governance'
# Typeset mathematical indices as true subscript runs rather than source-code text.
import re
for pp in d.paragraphs:
    if not re.search(r'\b(?:x_c|mu_c|sigma_c|z_k|z_j|p_k|p_1|sum_j|argmax_k)\b', pp.text):continue
    text=pp.text.replace('mu =','\u03bc =').replace('sigma =','\u03c3 =')
    pp.clear()
    for token in re.split(r'(\b(?:x_c|mu_c|sigma_c|z_k|z_j|p_k|p_1|sum_j|argmax_k)\b)',text):
        if re.fullmatch(r'(?:x_c|mu_c|sigma_c|z_k|z_j|p_k|p_1|sum_j|argmax_k)',token):
            base,index=token.split('_');base={'mu':'\u03bc','sigma':'\u03c3','sum':'\u03a3'}.get(base,base)
            rr=pp.add_run(base);rr.font.italic=True
            rr=pp.add_run(index);rr.font.subscript=True
        else:pp.add_run(token)
    for rr in pp.runs:rr.font.name='Times New Roman';rr.font.size=Pt(10);rr.bold=False;rr.font.color.rgb=RGBColor(0,0,0)
# Strip direct theme colors from all body runs, and set heading/title face explicitly.
for pp in d.paragraphs:
    for rr in pp.runs:
        if rr._r.rPr is not None:
            for color in rr._r.rPr.findall(qn('w:color')):
                for attr in ['themeColor','themeTint','themeShade']:color.attrib.pop(qn('w:'+attr),None)

temp=ROOT/'authored.docx';d.save(temp)
# Preserve unaffected reference package members exactly; only authored document,
# styles, relationships, properties and newly added image content are changed.
editable={'word/document.xml','word/styles.xml','word/_rels/document.xml.rels','[Content_Types].xml','docProps/core.xml'}
with ZipFile(SOURCE) as src,ZipFile(temp) as new,ZipFile(OUT,'w',ZIP_DEFLATED) as out:
    names=set(src.namelist())|set(new.namelist())
    for name in sorted(names):
        if name in editable or name not in src.namelist():out.writestr(name,new.read(name))
        else:out.writestr(name,src.read(name))
    preserved=[name for name in src.namelist() if name not in editable]
with ZipFile(SOURCE) as src,ZipFile(OUT) as out:
    assert all(src.read(name)==out.read(name) for name in preserved)
    inventory={name:{'bytes':len(src.read(name)),'sha256':hashlib.sha256(src.read(name)).hexdigest(),'preserved':name in preserved} for name in src.namelist()}
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==SOURCE_HASH
(ROOT/'package_inventory.json').write_text(json.dumps({'reference_sha256':SOURCE_HASH,'reference_pages':5,'parts':inventory,'final_sha256':hashlib.sha256(OUT.read_bytes()).hexdigest()},indent=2))
doc=Document(OUT)
alltext='\n'.join(x.text for x in doc.paragraphs)
assert '[INSERT' not in alltext and '\ufffd' not in alltext
print(json.dumps({'output':str(OUT),'paragraphs':len(doc.paragraphs),'words':len(alltext.split()),'figures':len(doc.inline_shapes),'tables':len(doc.tables),'sections':len(doc.sections),'source_sha256':SOURCE_HASH},indent=2))
