from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from copy import deepcopy
from lxml import etree as E
import hashlib, json, re

HERE=Path(__file__).resolve().parent
TEMPLATE=Path(r'C:\Users\Faizan Shaikh\Downloads\BR-TO-template-v1.7.docx')
SOURCE=HERE.parent.parent/'OpthaEdge_Research_Paper.docx'
OUT=HERE.parent.parent/'OpthaEdge_JCST_Thesis_Overview.docx'
W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PR='http://schemas.openxmlformats.org/package/2006/relationships'
ns={'w':W}
def el(tag,**attrs):return E.Element('{'+W+'}'+tag,{'{'+W+'}'+k:str(v) for k,v in attrs.items()})
def sub(p,tag,**a):e=el(tag,**a);p.append(e);return e
def xml(e):return E.tostring(e,xml_declaration=True,encoding='UTF-8',standalone=True)
def text(e):return ''.join(e.xpath('.//w:t/text()',namespaces=ns))
with ZipFile(TEMPLATE) as z:pkg={n:z.read(n) for n in z.namelist()}
baseline={n:hashlib.sha256(v).hexdigest() for n,v in pkg.items()}
with ZipFile(SOURCE) as z:src={n:z.read(n) for n in z.namelist()}
root=E.fromstring(pkg['word/document.xml']);body=root.find('w:body',ns)
section=deepcopy(root.findall('.//w:sectPr',ns)[0])
for c in list(body):body.remove(c)
sroot=E.fromstring(src['word/document.xml']);sb=sroot.find('w:body',ns)
rels=E.fromstring(pkg['word/_rels/document.xml.rels'])
srcrels={e.get('Id'):e for e in E.fromstring(src['word/_rels/document.xml.rels'])}
for e in list(rels):
    if e.get('Id')=='rId10':rels.remove(e)
def para(t='',style='JCST-Abstract',size=10,bold=False,align='both',before=0,after=6,keep=False,page=False):
    p=el('p');pr=sub(p,'pPr');sub(pr,'pStyle',val=style)
    if keep:sub(pr,'keepNext')
    sub(pr,'widowControl')
    if page:sub(pr,'pageBreakBefore')
    sub(pr,'spacing',before=before*20,after=after*20,line=240,lineRule='auto');sub(pr,'jc',val=align)
    r=sub(p,'r');rp=sub(r,'rPr');sub(rp,'b',val='1' if bold else '0');sub(rp,'sz',val=size*2);sub(rp,'szCs',val=size*2)
    sub(r,'t').text=t;body.append(p);return p
def heading(t,page=False):return para(t,size=10,bold=True,before=6,after=4,keep=True,page=page)
def image(source_index,width,caption):
    drawing=deepcopy(sb[source_index].find('.//w:drawing',ns));idx=len(body)
    for blip in drawing.xpath('.//*[local-name()="blip"]'):
        key='{'+R+'}embed';old=srcrels[blip.get(key)];rid=f'rId{100+idx}';name=f'overview_{idx}.png'
        pkg['word/media/'+name]=src['word/'+old.get('Target')]
        E.SubElement(rels,'{'+PR+'}Relationship',Id=rid,Type=R+'/image',Target='media/'+name);blip.set(key,rid)
    ex=drawing.xpath('.//*[local-name()="extent"]')[0];ratio=int(ex.get('cy'))/int(ex.get('cx'));cx=round(width*914400);cy=round(cx*ratio)
    ex.set('cx',str(cx));ex.set('cy',str(cy))
    for e in drawing.xpath('.//*[local-name()="xfrm"]/*[local-name()="ext"]'):e.set('cx',str(cx));e.set('cy',str(cy))
    for e in drawing.xpath('.//*[local-name()="docPr"]'):e.set('id',str(idx));e.set('name',caption.split('.')[0])
    p=para('',align='center',after=0,keep=True);p.find('w:r',ns).append(drawing)
    para(caption,'FigureCaption',8,after=6)

para('Thesis Overview:','JCST-BR-TO',14,True,'left',after=14,keep=True)
para('OpthaEdge for Diabetic Retinopathy Research Screening and Model Governance','JCST-Title',14,True,'center',after=8,keep=True)
for line in ['Shamail Pawar, Faizan Mustafa Shaikh and Ayaan Shaikh','Vidyalankar Institute of Technology, Mumbai, India','Department of Electronics & Computer Science Engineering','Project guide: Nayana Mahajan','shamail.pawar@vit.edu.in; faizanmustaffa.shaikh@vit.edu.in','ayaan.shaikh24@vit.edu.in']:
    para(line,'JCST-Authors',12,False,'center',after=0,keep=True)
para('',size=10,after=4)
para('OpthaEdge is a research-stage web platform that integrates two diabetic retinopathy (DR) inference paths with model metadata and a separate patient-record foundation (Fig. 1). It accepts fundus-image uploads and exposes the assumptions and limitations of exported models. The contribution is a reproducible software integration, not a newly trained classifier or a clinical diagnostic-accuracy study.')
para('DR can threaten vision, and early disease may be asymptomatic [1]. Published systems have been evaluated against expert reference standards and independent image collections [2], [3], including prospective assessment in primary care [4]. Those results cannot be transferred to OpthaEdge: the supplied project has no training provenance, verified class order, clinical test set or calibration evidence.')
image(20,4.0,'Fig. 1. Implemented architecture and planned services. Research inference and patient records follow separate paths; the prediction route neither enforces patient authorization nor persists screening results.')

heading('Implementation and model contracts',page=True)
para('A Next.js 16.2.1 application with React 19.2.4 and TypeScript receives JPEG or PNG uploads through POST /api/predict. File-signature, MIME, size and dimension checks precede Sharp preprocessing and local ONNX Runtime CPU execution [9]. Requests require an explicit binary or severity mode; the file limit is 10 MiB and the decoded-image limit is 50 million pixels. These checks do not establish retinal content or clinical gradability. Upload-size validation occurs after multipart parsing.')
para('The binary artifact, retinal_binary_model.onnx, receives a float32 tensor of shape [1, 3, 224, 224] and returns two logits. Its preprocessing uses cover resizing followed by channel normalization with means (0.485, 0.456, 0.406) and standard deviations (0.229, 0.224, 0.225). The severity artifact, inceptionv3.onnx, receives [1, 3, 299, 299], scales pixels as v / 127.5 - 1 and returns five logits. The Inception architecture reference [5] does not establish how this exported artifact was trained. Both paths assume three color channels; explicit conversion of every accepted color space to RGB is absent.')
para('CPU sessions initialize lazily and are cached. Decoders require float32 output with exactly two or five finite values and apply stable softmax. Binary decoding selects DR when its score is at least 0.5. Severity decoding returns the maximum-score label and a weighted index across the assumed five-class order. Neither the threshold nor class order is verified from training records, and normalized scores are not calibrated clinical probabilities [6]. Cover resizing may crop image edges; no lesion-aware crop, segmentation or training-time augmentation is implemented.')
para('A versioned registry records artifact hashes, input contracts, preprocessing versions and unresolved validation requirements. Both models are marked as blocked pending validation, but this status does not prevent calls to the unauthenticated prediction route. Registry hashes matched the reviewed files; the runtime does not enforce those hashes on every load. Patient services instead use development sessions, role checks and organization-scoped queries. Prisma declares examination, eye-image and prediction entities, but current screening outputs remain in browser state.')
heading('Technical verification')
para('Verification on 29 September 2026 used source commit 0099145dc145. All 12 existing unit tests and nine local HTTP checks passed; type checking and linting also passed. The successful HTTP checks used one generated 512 x 512 constant-color RGB image, which contained no retinal structures or patient data. Table 1 summarizes software behavior, not diagnostic performance.')
para('Table 1. Observed software verification','TableTitle',8,align='center',after=4,keep=True)
table=el('tbl');pr=sub(table,'tblPr');sub(pr,'tblW',w='9071',type='dxa');sub(pr,'tblLayout',type='fixed')
border=sub(pr,'tblBorders')
for side in ['top','left','bottom','right','insideH','insideV']:sub(border,side,val='single',sz=4,color='000000')
m=sub(pr,'tblCellMar')
for side in ['top','bottom']:sub(m,side,w=50,type='dxa')
for side in ['left','right']:sub(m,side,w=80,type='dxa')
grid=sub(table,'tblGrid');widths=[4300,950,3821]
for w in widths:sub(grid,'gridCol',w=w)
for rowidx,row in enumerate([['Check group','Cases','Observed result'],['Authorization, file, decoder and patient-input unit tests','12','All passed'],['HTTP rejection cases','7','Expected status and error code'],['Synthetic RGB inference, one request per model','2','Both returned HTTP 200'],['Type checking and lint','2','Both commands passed']]):
    tr=sub(table,'tr');trp=sub(tr,'trPr');sub(trp,'cantSplit')
    if not rowidx:sub(trp,'tblHeader')
    for s,w in zip(row,widths):
        tc=sub(tr,'tc');tcp=sub(tc,'tcPr');sub(tcp,'tcW',w=w,type='dxa');sub(tcp,'vAlign',val='center')
        p=para(s,size=9,bold=rowidx==0,align='left',after=0);body.remove(p);tc.append(p)
body.append(table)
para('The seven rejection cases covered missing image, unsupported mode, empty file, MIME mismatch, corrupt PNG, non-image content and a file above the size limit. The tests do not establish complete authentication, tenant isolation, audit retention, concurrency behavior, throughput or robustness to unusual color spaces and hostile workloads. Successful inference on a non-retinal image highlights the missing retinal-content and gradability gate.',before=6)

heading('Project interface and research boundaries',page=True)
image(95,6.20,'Fig. 2. Actual OpthaEdge screening selector captured locally without patient data. Binary and five-level severity tasks are available for research; the additional ocular-disease module is unavailable.')
para('The interface supports task selection (Fig. 2), upload, result inspection and structured errors. Changing tasks clears the selected file and result. A model-information page exposes validation blockers. Clinical deployment still requires production identity, rate control, server-enforced model approval, quality assessment, private image storage and persistent screening audit trails. There is no validated lesion localization, macular-edema detector or broader ocular-disease model. The product name does not establish performance on an edge device.')
para('A future study must first verify artifact provenance, preprocessing and class order, then define the intended population, reference grading, ungradable-image handling and patient-level data partitions. Prespecified evaluation should include sensitivity, specificity, predictive values and AUROC for the binary task; class-wise recall, macro-F1 and quadratic weighted kappa for severity; calibration, confidence intervals, external-site performance and subgroup analysis. CLAIM and TRIPOD+AI provide relevant reporting guidance [7], [8]. No diagnostic-performance estimate can be derived from the present technical checks.')
para('OpthaEdge provides an inspectable research integration with explicit model contracts and reproducible checks. Its next milestones are a provenance-complete, independently evaluated model package and a secure, persistent workflow. The reported work used software fixtures only, with no participants or identifiable patient records; any patient-based study requires separate ethics and consent arrangements. The authors acknowledge project guide Nayana Mahajan.')
heading('References')
for i in range(84,93):
    p=para(text(sb[i]),'References',8,after=2)
    pr=p.find('w:pPr',ns);np=sub(pr,'numPr');sub(np,'numId',val=0)
    sub(pr,'ind',left=240,hanging=240)
body.append(section)
pkg['word/document.xml']=xml(root);pkg['word/_rels/document.xml.rels']=xml(rels)
foot=E.fromstring(pkg['word/footnotes.xml'])
for e in list(foot):
    if int(e.get('{'+W+'}id','-1'))>0:foot.remove(e)
pkg['word/footnotes.xml']=xml(foot)
core=E.fromstring(pkg['docProps/core.xml'])
for e in core:
    if E.QName(e).localname=='title':e.text='OpthaEdge for Diabetic Retinopathy Research Screening and Model Governance'
    elif E.QName(e).localname=='creator':e.text='Shamail Pawar; Faizan Mustafa Shaikh; Ayaan Shaikh'
    elif E.QName(e).localname=='lastModifiedBy':e.text=''
pkg['docProps/core.xml']=xml(core)
with ZipFile(OUT,'w',ZIP_DEFLATED) as z:
    for n,v in pkg.items():z.writestr(n,v)
report={'output':str(OUT),'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'template_sha256':hashlib.sha256(TEMPLATE.read_bytes()).hexdigest(),'unchanged_parts':[n for n,h in baseline.items() if hashlib.sha256(pkg[n]).hexdigest()==h],'word_count':len(text(root).split()),'figures':2,'tables':1,'references':9}
(HERE/'checks.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
